import { Scenes } from 'telegraf';
import onboardingScene from './onboarding.js';

// 1. Initialize the Stage with all your scenes
// We only have 'onboarding' for now. We'll add 'filing' later.
const stage = new Scenes.Stage([onboardingScene]);

export default stage;