export interface OnboardingGoalDto {
  desiredIndustry: string;
  desiredPosition: string;
  experienceLevel: string;
}

export interface OnboardingPersonalDto {
  fullName: string;
  university?: string;
  major?: string;
  graduationYear?: number;
  bio?: string;
  hobbies?: string[];
}

