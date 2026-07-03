import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRippleModule } from '@angular/material/core';
import { DISCOVERY_MODES } from '../../constants/discovery-modes.constants';
import { DiscoveryMode, DiscoveryQuestion, DiscoveryIntent } from '../../models';
import { DiscoveryStateService } from '../../core/services/discovery-state.service';
import { PlaylistGeneratorService } from '../../core/services/playlist-generator.service';

@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatRippleModule,
  ],
  templateUrl: './discovery.component.html',
  styleUrls: ['./discovery.component.scss'],
})
export class DiscoveryComponent implements OnInit {
  readonly mode = signal<DiscoveryMode | null>(null);
  readonly currentStep = signal(0);
  readonly answers = signal<Record<string, string>>({});
  readonly customInputValue = signal('');
  readonly isGenerating = signal(false);
  readonly generationError = signal<string | null>(null);

  readonly currentQuestion = computed<DiscoveryQuestion | null>(() => {
    const m = this.mode();
    if (!m) return null;
    return m.questions[this.currentStep()] ?? null;
  });

  readonly totalSteps = computed(() => this.mode()?.questions.length ?? 0);

  readonly progressPercent = computed(() => {
    const total = this.totalSteps();
    if (total === 0) return 0;
    return Math.round((this.currentStep() / total) * 100);
  });

  readonly isLastStep = computed(
    () => this.currentStep() === this.totalSteps() - 1,
  );

  readonly canProceed = computed(() => {
    const question = this.currentQuestion();
    if (!question) return false;
    return !!this.answers()[question.id] || !!this.customInputValue().trim();
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private discoveryState: DiscoveryStateService,
    private playlistGenerator: PlaylistGeneratorService,
  ) {}

  ngOnInit(): void {
    const modeId = this.route.snapshot.paramMap.get('modeId');
    if (!modeId) {
      this.router.navigate(['/']);
      return;
    }

    const found = DISCOVERY_MODES.find((m) => m.id === modeId);
    if (!found) {
      this.router.navigate(['/']);
      return;
    }

    this.mode.set(found);
    this.discoveryState.setSelectedMode(modeId);
  }

  selectOption(questionId: string, option: string): void {
    this.answers.update((prev) => ({ ...prev, [questionId]: option }));
    this.customInputValue.set('');
  }

  isSelected(questionId: string, option: string): boolean {
    return this.answers()[questionId] === option;
  }

  onCustomInput(value: string): void {
    this.customInputValue.set(value);
    if (value.trim()) {
      const question = this.currentQuestion();
      if (question) {
        this.answers.update((prev) => ({ ...prev, [question.id]: value.trim() }));
      }
    }
  }

  onNext(): void {
    const question = this.currentQuestion();
    if (!question) return;

    const customVal = this.customInputValue().trim();
    if (customVal) {
      this.answers.update((prev) => ({ ...prev, [question.id]: customVal }));
    }

    if (!this.canProceed()) return;

    if (this.isLastStep()) {
      this.onGenerate();
    } else {
      this.currentStep.update((s) => s + 1);
      this.customInputValue.set('');
    }
  }

  onBack(): void {
    if (this.currentStep() === 0) {
      this.router.navigate(['/']);
    } else {
      this.currentStep.update((s) => s - 1);
    }
  }

  onGenerate(): void {
    const currentMode = this.mode();
    if (!currentMode) return;

    const currentAnswers = { ...this.answers() };
    const customVal = this.customInputValue().trim();
    const question = this.currentQuestion();
    if (customVal && question) {
      currentAnswers[question.id] = customVal;
    }

    const intent: DiscoveryIntent = {
      modeId: currentMode.id,
      modeTitle: currentMode.title,
      answers: currentAnswers,
    };

    this.discoveryState.setIntent(intent);
    this.isGenerating.set(true);
    this.generationError.set(null);

    this.playlistGenerator.generatePlaylist(intent).subscribe({
      next: () => {
        this.isGenerating.set(false);
        this.router.navigate(['/playlist']);
      },
      error: (err: Error) => {
        this.isGenerating.set(false);
        this.generationError.set(err.message);
      },
    });
  }

  onRetry(): void {
    this.generationError.set(null);
    this.onGenerate();
  }

  trackByOption(_index: number, option: string): string {
    return option;
  }
}
