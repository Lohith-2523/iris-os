import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AtlasClient from './atlas-client';

vi.mock('@/components/ui/formatted-markdown', () => ({ FormattedMarkdown: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
vi.mock('@/lib/atlas-ai/service', () => ({ AtlasAIService: { getSessions: vi.fn().mockResolvedValue([]) } }));

const initialData = { sessions: [], sessionMessages: {}, currentSessionId: null, messages: [], userId: 'user', userName: 'Test', userAvatarUrl: null };
let peer: FakePeer;
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] };
const play = vi.fn().mockResolvedValue(undefined);
class FakePeer {
  channel = { onopen: null as null | (() => void), onmessage: null as null | ((event: { data: string }) => void), onclose: null, close: vi.fn() };
  ontrack: ((event: { streams: unknown[] }) => void) | null = null;
  onconnectionstatechange = null;
  connectionState = 'connected';
  addTrack = vi.fn();
  createDataChannel = () => this.channel;
  createOffer = async () => ({ sdp: 'offer' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
  constructor() { peer = this; }
}
function emit(type: string, fields: Record<string, unknown> = {}) {
  act(() => peer.channel.onmessage?.({ data: JSON.stringify({ type, ...fields }) }));
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  vi.stubGlobal('RTCPeerConnection', FakePeer);
  vi.stubGlobal('Audio', class { autoplay = false; volume = 1; srcObject = null; play = play; });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/session')
    ? { ok: true, json: async () => ({ value: 'ephemeral-test-token' }) }
    : { ok: true, text: async () => 'answer' }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('keeps late user transcripts and assistant deltas in their own chat bubbles and plays remote audio', async () => {
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
  await waitFor(() => expect(peer.setRemoteDescription).toHaveBeenCalled());
  act(() => peer.channel.onopen?.());
  emit('input_audio_buffer.speech_started', { item_id: 'user-1' });
  emit('response.output_audio_transcript.delta', { item_id: 'atlas-1', delta: 'Hello' });
  emit('conversation.item.input_audio_transcription.completed', { item_id: 'user-1', transcript: 'Can you hear me?' });
  emit('response.output_audio_transcript.delta', { item_id: 'atlas-1', delta: ' there.' });
  expect(screen.getAllByText('Can you hear me?').length).toBeGreaterThan(0);
  expect(screen.getByText('Hello there.')).toBeInTheDocument();
  act(() => peer.ontrack?.({ streams: [stream] }));
  expect(play).toHaveBeenCalled();
  emit('response.done', { response: { status: 'failed', status_details: { error: { message: 'Voice quota exhausted' } } } });
  expect(screen.getByRole('alert')).toHaveTextContent('Voice quota exhausted');
});

it('replaces the editor with a full-width waveform, then restores the final transcript without WebRTC', async () => {
  let recorder: FakeRecorder;
  class FakeRecorder {
    static isTypeSupported = () => true;
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['audio']) }); this.onstop?.(); }
    constructor() { recorder = this; }
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ text: 'Create a project, please.' }) } as Response);
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Transcribe' }));
  await screen.findByRole('button', { name: 'Stop recording' });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('status', { name: 'Recording audio' }).querySelectorAll('i')).toHaveLength(64);
  expect(screen.getByRole('button', { name: 'Start voice conversation' })).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
  expect(await screen.findByRole('textbox')).toHaveValue('Create a project, please.');
  expect(fetch).toHaveBeenCalledWith('/api/atlas-ai/transcribe', expect.objectContaining({ method: 'POST' }));
  expect(recorder!.state).toBe('inactive');
});

it('releases a microphone granted after live startup was cancelled', async () => {
  let grant!: (value: MediaStream) => void;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise((resolve) => { grant = resolve; }) as Promise<MediaStream>);
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
  await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'End voice conversation' }));
  await act(async () => { grant(stream as unknown as MediaStream); });
  expect(stop).toHaveBeenCalled();
  expect(peer.addTrack).not.toHaveBeenCalled();
});

it('offers an explicit audio unlock when the browser blocks autoplay', async () => {
  play.mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'));
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
  await waitFor(() => expect(peer.setRemoteDescription).toHaveBeenCalled());
  act(() => peer.channel.onopen?.());
  await act(async () => peer.ontrack?.({ streams: [stream] }));
  fireEvent.click(screen.getByRole('button', { name: 'Enable audio' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Enable audio' })).not.toBeInTheDocument());
  expect(play).toHaveBeenCalledTimes(2);
});
