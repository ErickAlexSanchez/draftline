const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function objectKeyForJob(jobId: string): string {
  if (!JOB_ID.test(jobId)) {
    throw new Error("Invalid job id for storage key");
  }
  return `${jobId}.txt`;
}

export function isStorageKey(key: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.txt$/i.test(key);
}
