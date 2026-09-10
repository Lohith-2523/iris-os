import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AtlasClient from './atlas-client';
import { AtlasAIService } from '@/lib/atlas-ai/service';

vi.mock('@/components/ui/formatted-markdown', () => ({ FormattedMarkdown: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
vi.mock('@/lib/atlas-ai/service', () => ({ AtlasAIService: {
  getSessions: vi.fn().mockResolvedValue([]),
  persistVoiceTurn: vi.fn(),
  askAtlas: vi.fn(),
} }));

const initialData = { sessions: [], sessionMessages: {}, currentSessionId: null, messages: [], userId: 'user', userName: 'Test', userAvatarUrl: null };
let peer: FakePeer;
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] };
const play = vi.fn().mockResolvedValue(undefined);
class FakePeer {
  channel = { readyState: 'open', send: vi.fn(), onopen: null as null | (() => void), onmessage: null as null | ((event: { data: string }) => void), onclose: null, close: vi.fn() };
  ontrack: ((event: { streams: unknown[] }) => void) | null = null;
  onconnectionstatechange = null;
  connectionState = 'connected';
  addTrack = vi.fn();
  createDataChannel = () => this.channel;
  createOffer = async () => ({ sdp: 'offer' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  constructor() { peer = this; }
}
function emit(type: string, fields: Record<string, unknown> = {}) {
  act(() => peer.channel.onmessage?.({ data: JSON.stringify({ type, ...fields }) }));
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(AtlasAIService.persistVoiceTurn).mockResolvedValue({ sessionId: 'voice-history-1', created: false });
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  vi.stubGlobal('RTCPeerConnection', FakePeer);
  vi.stubGlobal('Audio', class { autoplay = false; volume = 1; srcObject = null; play = play; });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/session')
    ? { ok: true, json: async () => ({ value: 'ephemeral-test-token' }) }
    : { ok: true, text: async () => 'answer' }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('persists voice turns and executes multiple confirmed tool actions once in dependency order', async () => {
  vi.mocked(AtlasAIService.persistVoiceTurn)
    .mockResolvedValueOnce({ sessionId: 'voice-history-1', created: true })
    .mockResolvedValue({ sessionId: 'voice-history-1', created: false });
  vi.mocked(AtlasAIService.askAtlas)
    .mockResolvedValueOnce({
      result: 'Project Nova Launch was created and saved.',
      model: 'Atlas AI',
      sessionId: 'voice-history-1',
      automation: { completed: true, entity: { type: 'project', id: 'project-1', href: '/projects/project-1' } },
      workflow: { active: false, kind: 'PROJECT' },
    })
    .mockResolvedValueOnce({
      result: 'Invoice INV-VOICE-001 was created and saved.',
      model: 'Atlas AI',
      sessionId: 'voice-history-1',
      automation: { completed: true, entity: { type: 'invoice', id: 'invoice-1', href: '/invoices' } },
      workflow: { active: false, kind: 'INVOICE' },
    });
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
  await waitFor(() => expect(peer.setRemoteDescription).toHaveBeenCalled());
  act(() => peer.channel.onopen?.());

  emit('input_audio_buffer.speech_started', { item_id: 'user-hi' });
  emit('conversation.item.input_audio_transcription.completed', { item_id: 'user-hi', transcript: 'Hi' });
  emit('response.created', { response: { id: 'response-hi' } });
  emit('response.output_audio_transcript.delta', { item_id: 'atlas-hi', delta: 'Hello! ' });
  emit('response.output_audio_transcript.done', { item_id: 'atlas-hi', transcript: 'Hello! How can I help?' });
  expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
  expect(AtlasAIService.askAtlas).not.toHaveBeenCalled();
  await waitFor(() => expect(AtlasAIService.persistVoiceTurn).toHaveBeenCalledWith('user', 'Hi', undefined));
  await waitFor(() => expect(AtlasAIService.persistVoiceTurn).toHaveBeenCalledWith('assistant', 'Hello! How can I help?', 'voice-history-1'));

  emit('input_audio_buffer.speech_started', { item_id: 'user-1' });
  emit('conversation.item.input_audio_transcription.completed', { item_id: 'user-1', transcript: 'Create a project and an invoice.' });
  emit('conversation.item.input_audio_transcription.completed', { item_id: 'user-1', transcript: 'Create a project and an invoice.' });
  emit('response.output_audio_transcript.done', { item_id: 'atlas-1', transcript: 'What details should I use for both actions?' });
  emit('input_audio_buffer.speech_started', { item_id: 'user-2' });
  emit('conversation.item.input_audio_transcription.completed', {
    item_id: 'user-2',
    transcript: 'Create Nova Launch for Acme with the required dates and commercials, then invoice Nova Launch.',
  });
  emit('response.output_audio_transcript.done', {
    item_id: 'atlas-2',
    transcript: 'The Nova Launch project and its invoice are ready. Say Confirm to continue.',
  });
  expect(AtlasAIService.askAtlas).not.toHaveBeenCalled();
  expect(peer.channel.send).not.toHaveBeenCalledWith(expect.stringContaining('response.cancel'));

  emit('input_audio_buffer.speech_started', { item_id: 'user-3' });
  emit('conversation.item.input_audio_transcription.completed', { item_id: 'user-3', transcript: 'Yes.' });
  await waitFor(() => expect(AtlasAIService.persistVoiceTurn).toHaveBeenCalledWith('user', 'Yes.', 'voice-history-1'));
  expect(AtlasAIService.askAtlas).not.toHaveBeenCalled();

  const toolFields = {
    item: {
      type: 'function_call',
      status: 'completed',
      name: 'confirm_workspace_actions',
      call_id: 'call-1',
      id: 'tool-item-1',
      arguments: JSON.stringify({
        confirmed: true,
        actions: [
          {
            kind: 'PROJECT',
            request: 'Create project Nova Launch for Acme with the supplied dates and commercials.',
            details: { name: 'Nova Launch', clientName: 'Acme' },
          },
          {
            kind: 'INVOICE',
            request: 'Create and send an invoice for project Nova Launch.',
            details: { invoiceDocumentType: 'INVOICE', projectName: 'Nova Launch' },
          },
        ],
      }),
    },
  };
  emit('response.output_item.done', { item: { ...toolFields.item, status: 'incomplete' } });
  expect(AtlasAIService.askAtlas).not.toHaveBeenCalled();
  emit('response.output_item.done', toolFields);
  emit('response.output_item.done', toolFields);

  await waitFor(() => expect(AtlasAIService.askAtlas).toHaveBeenNthCalledWith(
    1,
    'Create project Nova Launch for Acme with the supplied dates and commercials.',
    undefined,
    'voice-history-1',
    expect.objectContaining({
      signal: expect.any(AbortSignal),
      onDelta: expect.any(Function),
      voiceWorkflow: expect.objectContaining({
        confirmed: true,
        action: {
          kind: 'PROJECT',
          request: 'Create project Nova Launch for Acme with the supplied dates and commercials.',
          details: { name: 'Nova Launch', clientName: 'Acme' },
        },
      }),
    }),
  ));
  await waitFor(() => expect(AtlasAIService.askAtlas).toHaveBeenNthCalledWith(
    2,
    'Create and send an invoice for project Nova Launch.',
    undefined,
    'voice-history-1',
    expect.objectContaining({
      voiceWorkflow: expect.objectContaining({
        confirmed: true,
        action: {
          kind: 'INVOICE',
          request: 'Create and send an invoice for project Nova Launch.',
          details: { invoiceDocumentType: 'INVOICE', projectName: 'Nova Launch' },
        },
      }),
    }),
  ));
  expect((await screen.findAllByText(/Project Nova Launch was created and saved/)).length).toBeGreaterThan(0);
  expect((await screen.findAllByText(/Invoice INV-VOICE-001 was created and saved/)).length).toBeGreaterThan(0);
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('response.cancel'));
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('output_audio_buffer.clear'));
  expect(AtlasAIService.askAtlas).toHaveBeenCalledTimes(2);
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('function_call_output'));
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('atlas_persisted_result'));
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('"tools":[]'));
  act(() => peer.ontrack?.({ streams: [stream] }));
  expect(play).toHaveBeenCalled();
  emit('response.done', { response: { status: 'failed', status_details: { error: { message: 'Voice quota exhausted' } } } });
  expect(screen.getByRole('alert')).toHaveTextContent('Voice quota exhausted');
});

it('reports a failed confirmed action to realtime voice instead of stalling silently', async () => {
  vi.mocked(AtlasAIService.askAtlas).mockRejectedValueOnce(new Error('Atlas could not reach the workspace. Please retry.'));
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
  await waitFor(() => expect(peer.setRemoteDescription).toHaveBeenCalled());
  act(() => peer.channel.onopen?.());

  emit('response.output_item.done', {
    item: {
      type: 'function_call',
      status: 'completed',
      name: 'confirm_workspace_actions',
      call_id: 'failed-call',
      arguments: JSON.stringify({
        confirmed: true,
        actions: [{
          kind: 'INVOICE',
          request: 'Create the confirmed invoice.',
          details: { invoiceDocumentType: 'INVOICE', projectName: 'Nova Launch' },
        }],
      }),
    },
  });

  expect((await screen.findAllByText('Atlas could not reach the workspace. Please retry.')).length).toBeGreaterThan(0);
  expect(screen.getByRole('alert')).toHaveTextContent('Atlas could not reach the workspace. Please retry.');
  await waitFor(() => expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('function_call_output')));
  const functionOutputEvent = vi.mocked(peer.channel.send).mock.calls
    .map(([payload]) => JSON.parse(String(payload)))
    .find((event) => event.item?.type === 'function_call_output');
  expect(JSON.parse(functionOutputEvent.item.output)).toMatchObject({ success: false });
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('atlas_persisted_result'));
});

it('keeps and narrates a committed result when refreshing chat history fails', async () => {
  vi.mocked(AtlasAIService.askAtlas).mockResolvedValueOnce({
    result: 'Invoice INV-VOICE-002 was created for Nova Launch.',
    model: 'Atlas AI',
    sessionId: 'voice-history-2',
    automation: { completed: true, entity: { type: 'invoice', id: 'invoice-2', href: '/invoices' } },
    workflow: { active: false, kind: 'INVOICE' },
  });
  vi.mocked(AtlasAIService.getSessions).mockRejectedValueOnce(new Error('History is temporarily unavailable.'));
  render(<AtlasClient initialData={initialData} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
  await waitFor(() => expect(peer.setRemoteDescription).toHaveBeenCalled());
  act(() => peer.channel.onopen?.());

  emit('response.output_item.done', {
    item: {
      type: 'function_call',
      status: 'completed',
      name: 'confirm_workspace_actions',
      call_id: 'successful-call',
      arguments: JSON.stringify({
        confirmed: true,
        actions: [{
          kind: 'INVOICE',
          request: 'Create the confirmed invoice.',
          details: { invoiceDocumentType: 'INVOICE', projectName: 'Nova Launch' },
        }],
      }),
    },
  });

  expect((await screen.findAllByText('Invoice INV-VOICE-002 was created for Nova Launch.')).length).toBeGreaterThan(0);
  await waitFor(() => expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('atlas_persisted_result')));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
