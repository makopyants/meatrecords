export type ReleaseStatus =
  | "DRAFT"
  | "CONTENT_PENDING"
  | "CONTENT_REVIEW"
  | "MODERATION_QUEUE"
  | "APPROVED"
  | "REJECTED"
  | "DISTRIBUTING"
  | "LIVE";

export type ReleaseEvent =
  | "submit_for_generation"
  | "submit_skip_ai"
  | "all_jobs_finished"
  | "cancel_generation"
  | "submit_to_moderation"
  | "regenerate"
  | "back_to_edit"
  | "approve"
  | "reject"
  | "send_back"
  | "start_distribution"
  | "mark_live"
  | "revise";

export type ActorRole = "artist" | "moderator" | "system";

export interface TransitionContext {
  release: {
    status: ReleaseStatus;
    title: string;
    brandProfileStatus?: "DRAFT" | "LOCKED";
    hasAudioMaster: boolean;
    hasCoverAsset: boolean;
    hasGenre: boolean;
  };
  event: ReleaseEvent;
  actorRole: ActorRole;
  reason?: string;
}

interface TransitionDefinition {
  from: ReleaseStatus;
  to: ReleaseStatus;
  event: ReleaseEvent;
  actor: ActorRole;
  guard?: (ctx: TransitionContext) => string | null;
}

const TRANSITIONS: TransitionDefinition[] = [
  {
    from: "DRAFT",
    to: "CONTENT_PENDING",
    event: "submit_for_generation",
    actor: "artist",
    guard: (ctx) => {
      if (!ctx.release.hasAudioMaster) return "Нет аудиофайла (AUDIO_MASTER)";
      if (ctx.release.brandProfileStatus !== "LOCKED") return "BrandProfile не залочен";
      if (!ctx.release.title.trim()) return "Нет названия релиза";
      return null;
    },
  },
  {
    from: "DRAFT",
    to: "MODERATION_QUEUE",
    event: "submit_skip_ai",
    actor: "artist",
    guard: (ctx) => {
      if (!ctx.release.hasAudioMaster) return "Нет аудиофайла (AUDIO_MASTER)";
      if (!ctx.release.title.trim()) return "Нет названия релиза";
      return null;
    },
  },
  {
    from: "CONTENT_PENDING",
    to: "CONTENT_REVIEW",
    event: "all_jobs_finished",
    actor: "system",
  },
  {
    from: "CONTENT_PENDING",
    to: "DRAFT",
    event: "cancel_generation",
    actor: "artist",
  },
  {
    from: "CONTENT_REVIEW",
    to: "MODERATION_QUEUE",
    event: "submit_to_moderation",
    actor: "artist",
  },
  {
    from: "CONTENT_REVIEW",
    to: "CONTENT_PENDING",
    event: "regenerate",
    actor: "artist",
  },
  {
    from: "CONTENT_REVIEW",
    to: "DRAFT",
    event: "back_to_edit",
    actor: "artist",
  },
  {
    from: "MODERATION_QUEUE",
    to: "APPROVED",
    event: "approve",
    actor: "moderator",
    guard: (ctx) => {
      if (!ctx.release.hasCoverAsset) return "Нет обложки (COVER asset)";
      if (!ctx.release.hasGenre) return "Нет жанра в metadata";
      return null;
    },
  },
  {
    from: "MODERATION_QUEUE",
    to: "REJECTED",
    event: "reject",
    actor: "moderator",
    guard: (ctx) => {
      if (!ctx.reason?.trim()) return "Необходима причина отказа";
      return null;
    },
  },
  {
    from: "MODERATION_QUEUE",
    to: "DRAFT",
    event: "send_back",
    actor: "moderator",
    guard: (ctx) => {
      if (!ctx.reason?.trim()) return "Необходима причина возврата";
      return null;
    },
  },
  {
    from: "APPROVED",
    to: "DISTRIBUTING",
    event: "start_distribution",
    actor: "moderator",
  },
  {
    from: "DISTRIBUTING",
    to: "LIVE",
    event: "mark_live",
    actor: "moderator",
  },
  {
    from: "REJECTED",
    to: "DRAFT",
    event: "revise",
    actor: "artist",
  },
];

export interface TransitionResult {
  allowed: boolean;
  toStatus?: ReleaseStatus;
  reason?: string;
}

export function canTransition(ctx: TransitionContext): TransitionResult {
  const transition = TRANSITIONS.find(
    (t) =>
      t.from === ctx.release.status &&
      t.event === ctx.event &&
      t.actor === ctx.actorRole,
  );

  if (!transition) {
    return {
      allowed: false,
      reason: `Переход ${ctx.release.status} → ${ctx.event} для роли ${ctx.actorRole} не разрешён`,
    };
  }

  if (transition.guard) {
    const guardError = transition.guard(ctx);
    if (guardError) {
      return { allowed: false, reason: guardError };
    }
  }

  return { allowed: true, toStatus: transition.to };
}

export function getAvailableEvents(
  status: ReleaseStatus,
  actorRole: ActorRole,
): ReleaseEvent[] {
  return TRANSITIONS.filter((t) => t.from === status && t.actor === actorRole).map(
    (t) => t.event,
  );
}
