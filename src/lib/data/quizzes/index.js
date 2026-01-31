import generalKnowledge from './general_knowledge.json';
import spaceExploration from './space_exploration.json';

export const quizzes = [
    {
        id: 'general_knowledge',
        name: 'General Knowledge',
        description: 'A mix of math, geography, and science.',
        questions: generalKnowledge
    },
    {
        id: 'space_exploration',
        name: 'Space Exploration',
        description: 'Test your knowledge about the universe.',
        questions: spaceExploration
    }
];
