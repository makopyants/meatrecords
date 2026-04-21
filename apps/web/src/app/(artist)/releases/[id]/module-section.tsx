import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULE_LABEL: Record<string, string> = {
  COVER: "Обложка",
  SOCIAL: "Соцсети",
  TEASER: "Видеотизер",
  BRAND: "Бренд",
};

const GEN_STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидает",
  READY: "Готово",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
};

const JOB_STATUS_LABEL: Record<string, string> = {
  QUEUED: "В очереди",
  RUNNING: "Генерируется...",
  SUCCEEDED: "Завершено",
  FAILED: "Ошибка",
};

interface Props {
  releaseId: string;
  module: string;
  content: { status: string; payload: unknown } | null;
  jobStatus: string | null;
}

export function ModuleSection({ module, content, jobStatus }: Props) {
  const label = MODULE_LABEL[module] ?? module;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {content ? (
            <Badge variant={content.status === "APPROVED" ? "default" : "secondary"}>
              {GEN_STATUS_LABEL[content.status] ?? content.status}
            </Badge>
          ) : jobStatus ? (
            <Badge variant={jobStatus === "FAILED" ? "destructive" : "secondary"}>
              {JOB_STATUS_LABEL[jobStatus] ?? jobStatus}
            </Badge>
          ) : (
            <Badge variant="outline">Не запущено</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!content && !jobStatus && (
          <p className="text-sm text-muted-foreground">
            Будет сгенерировано автоматически после запуска пайплайна.
          </p>
        )}
        {jobStatus === "RUNNING" && (
          <p className="text-sm text-muted-foreground animate-pulse">Генерация в процессе...</p>
        )}
        {jobStatus === "FAILED" && (
          <p className="text-sm text-destructive">Ошибка генерации. Можно повторить.</p>
        )}
        {content?.status === "READY" && (
          <p className="text-sm text-muted-foreground">Результат готов — требует одобрения.</p>
        )}
      </CardContent>
    </Card>
  );
}
