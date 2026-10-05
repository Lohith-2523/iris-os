type RealtimeEvent = Record<string, unknown> & { type?: string; event_id?: string };
type ActiveReply = {
  eventId: string;
  responseId?: string;
  generationDone: boolean;
  hasAudio: boolean;
  playbackDone: boolean;
};

// Generation can finish while WebRTC still has audio to play. Both must finish
// before the next request, including out-of-conversation workflow narration.
export class RealtimeReplyQueue {
  private pending: RealtimeEvent[] = [];
  private active: ActiveReply | null = null;
  private sequence = 0;
  private closed = false;
  private lastFinishedResponseId?: string;

  constructor(private readonly send: (event: RealtimeEvent) => void) {}

  enqueue(event: RealtimeEvent) {
    if (this.closed) return;
    // Several spoken fragments awaiting a reply already share conversation
    // context. One reply can answer them together, without duplicate replies.
    if (!event.response) this.pending = this.pending.filter((item) => Boolean(item.response));
    this.pending.push({ ...event, event_id: event.event_id || `atlas-reply:${++this.sequence}` });
    this.flush();
  }

  handle(event: RealtimeEvent) {
    const active = this.active;
    if (!active || this.closed) return;
    const response = event.response as { id?: string; output?: Array<{ content?: Array<{ type?: string }> }> } | undefined;
    const responseId = response?.id || String(event.response_id || '');
    if (responseId && responseId === this.lastFinishedResponseId) return;
    if (active.responseId && responseId && responseId !== active.responseId) return;
    if (responseId) active.responseId = responseId;

    if (event.type === 'response.created') {
      active.responseId = response?.id;
    } else if (event.type === 'output_audio_buffer.started' || event.type === 'response.output_audio.delta' || event.type === 'response.output_audio_transcript.delta') {
      active.hasAudio = true;
    } else if (event.type === 'output_audio_buffer.stopped' || event.type === 'output_audio_buffer.cleared') {
      active.playbackDone = true;
    } else if (event.type === 'response.done') {
      active.generationDone = true;
      active.hasAudio ||= Boolean(response?.output?.some((item) => item.content?.some((content) => content.type === 'audio' || content.type === 'output_audio')));
    } else if (event.type === 'error') {
      const error = event.error as { event_id?: string } | undefined;
      if ((error?.event_id || event.event_id) !== active.eventId) return;
      // A rejected create never began generating or playing audio.
      active.generationDone = true;
      active.playbackDone = true;
    }

    if (active.generationDone && (!active.hasAudio || active.playbackDone)) {
      this.lastFinishedResponseId = active.responseId;
      this.active = null;
      this.flush();
    }
  }

  close() {
    this.closed = true;
    this.pending = [];
    this.active = null;
  }

  private flush() {
    if (this.closed || this.active) return;
    const event = this.pending.shift();
    if (!event) return;
    // Claim the slot before sending: another transcript may arrive before the
    // provider acknowledges response.created.
    this.active = { eventId: event.event_id!, generationDone: false, hasAudio: false, playbackDone: false };
    this.send(event);
  }
}
