import { describe, expect, it, vi } from 'vitest';
import { RealtimeReplyQueue } from './realtime-reply-queue';

const turn = (id: string) => ({ type: 'response.create', event_id: id });
const audioDone = (id: string) => ({ type: 'response.done', response: { id, output: [{ content: [{ type: 'audio' }] }] } });

describe('Miles voice reply sequencing', () => {
  it('waits for the first reply even before response.created arrives', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('second'));
    expect(send).toHaveBeenCalledTimes(1);
    queue.handle({ type: 'response.created', response: { id: 'reply-1' } });
    queue.handle(audioDone('reply-1'));
    expect(send).toHaveBeenCalledTimes(1);
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'reply-1' });
    expect(send).toHaveBeenLastCalledWith(turn('second'));
  });

  it('waits for generation when playback stops first', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('second'));
    queue.handle({ type: 'output_audio_buffer.started', response_id: 'reply-1' });
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'reply-1' });
    expect(send).toHaveBeenCalledTimes(1);
    queue.handle(audioDone('reply-1'));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('waits for audio even when playback starts after generation finishes', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('second'));
    queue.handle(audioDone('reply-1'));
    queue.handle({ type: 'output_audio_buffer.started', response_id: 'reply-1' });
    expect(send).toHaveBeenCalledTimes(1);
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'reply-1' });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('serializes workflow narration with ordinary replies', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue({ type: 'response.create', response: { conversation: 'none', metadata: { purpose: 'atlas_persisted_result' } } });
    queue.enqueue(turn('next-user'));
    queue.handle({ type: 'response.done', response: { output: [{ type: 'function_call' }] } });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].response.conversation).toBe('none');
    queue.handle(audioDone('narration'));
    expect(send).toHaveBeenCalledTimes(2);
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'narration' });
    expect(send).toHaveBeenLastCalledWith(turn('next-user'));
  });

  it('combines pending spoken fragments into one subsequent reply', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('fragment-1'));
    queue.enqueue(turn('fragment-2'));
    queue.handle({ type: 'response.done', response: { output: [] } });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith(turn('fragment-2'));
  });

  it('does not release the current reply on an old response completion', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.handle({ type: 'response.created', response: { id: 'current' } });
    queue.enqueue(turn('second'));
    queue.handle({ type: 'response.done', response: { id: 'old', output: [] } });
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'old' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('releases a rejected create using the nested error event ID', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('second'));
    queue.handle({ type: 'error', event_id: 'server-event', error: { event_id: 'unrelated' } });
    expect(send).toHaveBeenCalledTimes(1);
    queue.handle({ type: 'error', error: { event_id: 'first' } });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('ignores duplicate completion events while the next create awaits acknowledgment', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('second'));
    queue.handle(audioDone('reply-1'));
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'reply-1' });
    queue.enqueue(turn('third'));
    queue.handle(audioDone('reply-1'));
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'reply-1' });
    queue.handle(audioDone('reply-2'));
    expect(send).toHaveBeenCalledTimes(2);
    queue.handle({ type: 'output_audio_buffer.stopped', response_id: 'reply-2' });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('drops queued replies when the user stops the voice session', () => {
    const send = vi.fn();
    const queue = new RealtimeReplyQueue(send);
    queue.enqueue(turn('first'));
    queue.enqueue(turn('second'));
    queue.close();
    queue.handle({ type: 'response.done', response: { output: [] } });
    queue.enqueue(turn('late'));
    expect(send).toHaveBeenCalledTimes(1);
  });
});
