import type { ModelGateway } from "@draftline/domain";

export function renderDraft(prompt: string): string {
  return `${prompt.trim()}\n\nReview it before you share it.`;
}

export class FakeModelGateway implements ModelGateway {
  constructor(private readonly delayMs: number) {}

  async generate(input: { prompt: string }): Promise<{ text: string }> {
    if (this.delayMs > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.delayMs);
      });
    }
    return { text: renderDraft(input.prompt) };
  }
}
