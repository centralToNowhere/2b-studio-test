import { makeAutoObservable, runInAction } from 'mobx';
import { create, persist } from 'mobx-persist';
import { notifyError } from '@/shared/ui/toast';
class DraftStore {
  values: Record<string, string> = {};
  ready = false;
  constructor() {
    makeAutoObservable(this);
  }
  set(key: string, value: string) {
    this.values = { ...this.values, [key]: value };
  }
  clear(key: string) {
    const next = { ...this.values };

    delete next[key];
    this.values = next;
  }
}
export const drafts = persist({ values: { type: 'object' } })(new DraftStore());
const hydrate = create({ storage: localStorage, jsonify: true, debounce: 100 });

hydrate('crm-drafts-v1', drafts)
  .catch(() => notifyError(new Error('Не удалось восстановить черновики')))
  .finally(() =>
    runInAction(() => {
      drafts.ready = true;
    }),
  );

export const draftKey = (userId: string, kind: string, id: string) =>
  `${userId}:${kind}:${id}`;
