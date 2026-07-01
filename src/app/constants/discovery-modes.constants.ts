import { DiscoveryMode } from '../models';

export const DISCOVERY_MODES: DiscoveryMode[] = [
  {
    id: 'hidden-gems',
    title: 'Hidden Gems',
    description: 'Discover underrated artists and tracks you have never heard before',
    icon: 'diamond',
    gradient: 'linear-gradient(135deg, #6C63FF 0%, #3F3D8C 100%)',
    questions: [
      {
        id: 'popularity',
        text: 'What level of obscurity are you comfortable with?',
        options: ['Very underground', 'Somewhat underground', 'Up and coming', 'Almost mainstream'],
        allowCustom: false,
      },
      {
        id: 'genre_range',
        text: 'How adventurous do you want to be with genres?',
        options: ['Stay close to what I know', 'Slightly different', 'Quite different', 'Completely new territory'],
        allowCustom: true,
      },
    ],
  },
  {
    id: 'workout',
    title: 'Workout',
    description: 'High-energy tracks to power your training session',
    icon: 'fitness_center',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #C0392B 100%)',
    questions: [
      {
        id: 'activity',
        text: 'What are you doing?',
        options: ['Gym', 'Running', 'Cycling', 'Yoga', 'Walking'],
        allowCustom: true,
      },
      {
        id: 'energy',
        text: 'Preferred energy level?',
        options: ['High', 'Medium', 'Low'],
        allowCustom: true,
      },
    ],
  },
  {
    id: 'focus',
    title: 'Focus',
    description: 'Curated tracks to help you concentrate and stay in flow',
    icon: 'psychology',
    gradient: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
    questions: [
      {
        id: 'task_type',
        text: 'What kind of work are you doing?',
        options: ['Deep coding', 'Writing', 'Reading', 'Creative work', 'Admin tasks'],
        allowCustom: true,
      },
      {
        id: 'preference',
        text: 'Do you want lyrics or instrumentals?',
        options: ['Instrumentals only', 'Minimal lyrics', 'Lyrics are fine', 'No preference'],
        allowCustom: false,
      },
    ],
  },
  {
    id: 'commute',
    title: 'Commute',
    description: 'Perfect soundtrack for your journey, whether short or long',
    icon: 'directions_transit',
    gradient: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
    questions: [
      {
        id: 'transport',
        text: 'How are you getting there?',
        options: ['Train or metro', 'Bus', 'Car', 'Walking', 'Cycling'],
        allowCustom: true,
      },
      {
        id: 'mood',
        text: 'What mood do you want to be in when you arrive?',
        options: ['Energised', 'Calm', 'Motivated', 'Happy', 'Reflective'],
        allowCustom: true,
      },
    ],
  },
  {
    id: 'chill',
    title: 'Chill',
    description: 'Relaxing music to unwind, decompress, and just breathe',
    icon: 'weekend',
    gradient: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)',
    questions: [
      {
        id: 'setting',
        text: 'Where are you chilling?',
        options: ['Home', 'Cafe', 'Outdoors', 'In bed', 'With friends'],
        allowCustom: true,
      },
      {
        id: 'vibe',
        text: 'What vibe are you after?',
        options: ['Cosy and warm', 'Cool and minimal', 'Dreamy', 'Lo-fi', 'Acoustic'],
        allowCustom: true,
      },
    ],
  },
  {
    id: 'surprise-me',
    title: 'Surprise Me',
    description: 'Let AI take full creative control and send you somewhere unexpected',
    icon: 'shuffle',
    gradient: 'linear-gradient(135deg, #C850C0 0%, #4158D0 100%)',
    questions: [
      {
        id: 'constraint',
        text: 'Any hard constraints?',
        options: ['No explicit lyrics', 'No metal or harsh sounds', 'No slow songs', 'Anything goes'],
        allowCustom: true,
      },
      {
        id: 'time_period',
        text: 'Era preference?',
        options: ['Completely random', 'Mostly modern', 'Mostly classic', 'Mix of everything'],
        allowCustom: false,
      },
    ],
  },
];

export const FEEDBACK_TYPES = [
  { type: 'more_like_this' as const, label: 'More like this', icon: 'thumb_up', description: 'Refine future matches in this specific direction' },
  { type: 'less_like_this' as const, label: 'Less like this', icon: 'thumb_down', description: 'Pivot away from this style and tempo' },
  { type: 'different_artists' as const, label: 'Different artists', icon: 'person_off', description: 'Find tracks within the same genre but other artists' },
  { type: 'different_genres' as const, label: 'Different genres', icon: 'category', description: 'Shift to a completely different sonic genre profile' },
  { type: 'refresh' as const, label: 'Refresh playlist', icon: 'refresh', description: 'Regenerate a new set of tracks with the same parameters' },
] as const;

