export const META_SDK_READY_EVENT = 'crystal:meta-sdk-ready';
export const META_SDK_ERROR_EVENT = 'crystal:meta-sdk-error';

export type MetaSdkStatus = 'loading' | 'ready' | 'error';

export function getMetaSdkStatus(): MetaSdkStatus {
  if (typeof document === 'undefined') {
    return 'loading';
  }

  const status = document.documentElement.dataset.metaSdkStatus;
  return status === 'ready' || status === 'error' ? status : 'loading';
}
