import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button,
  Progress,
  Modal,
  Rate,
  Input,
  message,
  Steps,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ForwardOutlined,
  FireOutlined,
  StarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { RecipeStep } from '@/types';
import { formatDuration } from '@/utils';

interface CookingModeProps {
  steps: RecipeStep[];
  recipeName: string;
  recipeId: number;
  estimatedMinutes: number;
  onComplete: (data: {
    startedAt: string;
    completedAt: string;
    actualMinutes: number;
    stepRecords: string;
    rating: number;
    review: string;
  }) => void;
  onCancel: () => void;
}

interface StepRecord {
  order: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}

const CookingMode: React.FC<CookingModeProps> = ({
  steps,
  recipeName,
  recipeId,
  estimatedMinutes,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepTimerSeconds, setStepTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [overallElapsed, setOverallElapsed] = useState(0);
  const [stepRecords, setStepRecords] = useState<StepRecord[]>([]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [startedAt] = useState(() => new Date().toISOString());
  const stepStartRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setOverallElapsed((prev) => prev + 1);
      if (isTimerRunning) {
        setStepTimerSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    if (currentStep < steps.length && !completedSteps.has(currentStep)) {
      stepStartRef.current = new Date().toISOString();
      setStepTimerSeconds(0);
    }
  }, [currentStep]);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const completeCurrentStep = () => {
    const step = steps[currentStep];
    const now = new Date().toISOString();
    const newRecord: StepRecord = {
      order: step.order,
      startedAt: stepStartRef.current,
      completedAt: now,
      durationSeconds: stepTimerSeconds,
    };

    setStepRecords((prev) => [...prev, newRecord]);
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setIsTimerRunning(false);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      playBeep();
      message.success(`步骤 ${step.order} 完成！`);
    } else {
      playBeep();
      message.success('所有步骤已完成！请进行评价');
      setShowFinishModal(true);
    }
  };

  const skipToNextStep = () => {
    if (currentStep < steps.length - 1) {
      const step = steps[currentStep];
      const now = new Date().toISOString();
      const newRecord: StepRecord = {
        order: step.order,
        startedAt: stepStartRef.current,
        completedAt: now,
        durationSeconds: stepTimerSeconds,
      };
      setStepRecords((prev) => [...prev, newRecord]);
      setIsTimerRunning(false);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    const completedAt = new Date().toISOString();
    const actualMinutes = Math.round(overallElapsed / 60);
    onComplete({
      startedAt,
      completedAt,
      actualMinutes,
      stepRecords: JSON.stringify(stepRecords),
      rating,
      review,
    });
  };

  const allCompleted = completedSteps.size === steps.length;
  const progressPercent = Math.round((completedSteps.size / steps.length) * 100);
  const currentStepData = steps[currentStep];
  const stepDuration = currentStepData?.duration_minutes || 0;
  const stepProgress = stepDuration > 0 ? Math.min(100, Math.round((stepTimerSeconds / (stepDuration * 60)) * 100)) : 0;

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF8E1 100%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid rgba(139,195,74,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FireOutlined style={{ color: '#FF8A65', fontSize: 24 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#4A4A4A' }}>
              烹饪模式 · {recipeName}
            </div>
            <div style={{ fontSize: 13, color: '#A0A0A0' }}>
              预计 {formatDuration(estimatedMinutes)} · 已用时 {formatDuration(Math.round(overallElapsed / 60))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#A0A0A0' }}>总体进度</div>
            <div style={{ fontWeight: 700, color: '#689F38' }}>{completedSteps.size}/{steps.length} 步骤</div>
          </div>
          <Progress
            type="circle"
            percent={progressPercent}
            size={48}
            strokeColor={{ from: '#8BC34A', to: '#689F38' }}
            strokeWidth={8}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '退出烹饪模式',
                content: '确定要退出吗？当前进度将不会保存。',
                okText: '确定退出',
                cancelText: '继续烹饪',
                okButtonProps: { danger: true },
                onOk: onCancel,
              });
            }}
            style={{ color: '#A0A0A0' }}
          />
        </div>
      </div>

      <div style={{ padding: '16px 24px 0' }}>
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 8 }}
        >
          {steps.map((step, idx) => (
            <Steps.Step
              key={step.order}
              title={`步骤${step.order}`}
              status={
                completedSteps.has(idx)
                  ? 'finish'
                  : idx === currentStep
                  ? 'process'
                  : 'wait'
              }
            />
          ))}
        </Steps>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {currentStepData && !allCompleted && (
          <>
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: '32px',
                boxShadow: '0 8px 32px rgba(139,195,74,0.08)',
                border: '1px solid rgba(139,195,74,0.12)',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8BC34A, #689F38)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 28,
                  margin: '0 auto 16px',
                }}
              >
                {currentStepData.order}
              </div>
              <div style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 8 }}>
                步骤 {currentStepData.order} / {steps.length}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#4A4A4A',
                  lineHeight: 1.6,
                  marginBottom: stepDuration > 0 ? 24 : 0,
                }}
              >
                {currentStepData.description}
              </div>

              {stepDuration > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    <ClockCircleOutlined style={{ color: '#FF8A65' }} />
                    <span style={{ color: '#7A7A7A' }}>建议用时 {formatDuration(stepDuration)}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 700,
                      fontFamily: "'Courier New', monospace",
                      color: isTimerRunning ? '#FF5722' : stepProgress >= 100 ? '#66BB6A' : '#FF8A65',
                      lineHeight: 1,
                      marginBottom: 12,
                    }}
                  >
                    {formatSeconds(stepTimerSeconds)}
                  </div>
                  {stepDuration > 0 && (
                    <Progress
                      percent={stepProgress}
                      showInfo={false}
                      strokeColor={
                        stepProgress >= 100
                          ? { from: '#66BB6A', to: '#8BC34A' }
                          : { from: '#FF8A65', to: '#FF5722' }
                      }
                      style={{ maxWidth: 300, margin: '0 auto' }}
                    />
                  )}
                  {stepProgress >= 100 && stepDuration > 0 && (
                    <div style={{ marginTop: 8, color: '#66BB6A', fontWeight: 500 }}>
                      ⏰ 建议时间已到，可以进入下一步了
                    </div>
                  )}
                </div>
              )}

              {stepDuration === 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <ClockCircleOutlined style={{ color: '#8BC34A' }} />
                    <span style={{ color: '#7A7A7A' }}>已计时 {formatSeconds(stepTimerSeconds)}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button
                size="large"
                icon={isTimerRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={toggleTimer}
                style={{
                  height: 52,
                  borderRadius: 26,
                  padding: '0 28px',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {isTimerRunning ? '暂停计时' : '开始计时'}
              </Button>
              {currentStep < steps.length - 1 && (
                <Button
                  size="large"
                  icon={<ForwardOutlined />}
                  onClick={skipToNextStep}
                  style={{
                    height: 52,
                    borderRadius: 26,
                    padding: '0 28px',
                  }}
                >
                  跳过此步
                </Button>
              )}
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={completeCurrentStep}
                style={{
                  height: 52,
                  borderRadius: 26,
                  padding: '0 28px',
                  fontSize: 16,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #8BC34A, #689F38)',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(139,195,74,0.3)',
                }}
              >
                {currentStep < steps.length - 1 ? '完成此步骤' : '完成全部'}
              </Button>
            </div>
          </>
        )}

        {allCompleted && !showFinishModal && (
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '48px 32px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(139,195,74,0.08)',
              border: '1px solid rgba(139,195,74,0.12)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#689F38', marginBottom: 8 }}>
              烹饪完成！
            </div>
            <div style={{ color: '#7A7A7A', marginBottom: 24 }}>
              实际用时 {formatDuration(Math.round(overallElapsed / 60))}
              {estimatedMinutes > 0 && ` (预计 ${formatDuration(estimatedMinutes)})`}
            </div>
            <Button
              type="primary"
              size="large"
              icon={<StarOutlined />}
              onClick={() => setShowFinishModal(true)}
              style={{
                height: 52,
                borderRadius: 26,
                padding: '0 32px',
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #8BC34A, #689F38)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(139,195,74,0.3)',
              }}
            >
              评价并保存记录
            </Button>
          </div>
        )}
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarOutlined style={{ color: '#FFD54F' }} />
            <span>烹饪评价</span>
          </div>
        }
        open={showFinishModal}
        onOk={handleFinish}
        onCancel={() => setShowFinishModal(false)}
        okText="保存记录"
        cancelText="稍后评价"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #8BC34A, #689F38)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
          },
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ color: '#7A7A7A', marginBottom: 8 }}>为这次烹饪打分</div>
            <Rate
              value={rating}
              onChange={setRating}
              style={{ fontSize: 36 }}
              character={<StarOutlined />}
            />
          </div>
          <div>
            <div style={{ color: '#7A7A7A', marginBottom: 8 }}>写下你的烹饪心得</div>
            <Input.TextArea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="今天这道菜做得怎么样？有什么想改进的地方？"
              rows={4}
              style={{ borderRadius: 12 }}
            />
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(139,195,74,0.06)',
              borderRadius: 12,
              fontSize: 13,
              color: '#7A7A7A',
            }}
          >
            <div>📋 实际用时：{formatDuration(Math.round(overallElapsed / 60))}</div>
            {estimatedMinutes > 0 && <div>⏱️ 预计用时：{formatDuration(estimatedMinutes)}</div>}
            <div>✅ 完成步骤：{completedSteps.size}/{steps.length}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CookingMode;
