import { Injectable, signal } from '@angular/core';
import { DiscoveryIntent } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class DiscoveryStateService {
  readonly currentIntent = signal<DiscoveryIntent | null>(null);
  readonly selectedModeId = signal<string | null>(null);
  readonly currentStep = signal<number>(0);

  setIntent(intent: DiscoveryIntent): void {
    this.currentIntent.set(intent);
  }

  setSelectedMode(modeId: string): void {
    this.selectedModeId.set(modeId);
    this.currentStep.set(0);
  }

  advanceStep(): void {
    this.currentStep.update((step) => step + 1);
  }

  reset(): void {
    this.currentIntent.set(null);
    this.selectedModeId.set(null);
    this.currentStep.set(0);
  }
}
