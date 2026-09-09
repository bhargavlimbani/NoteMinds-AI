import { Router } from 'express';
import authRoutes from './auth.routes.js';
import subjectRoutes from './subject.routes.js';
import unitRoutes from './unit.routes.js';
import topicRoutes from './topic.routes.js';
import noteRoutes from './note.routes.js';
import chatRoutes from './chat.routes.js';
import conversationRoutes from './conversation.routes.js';
import quizRoutes from './quiz.routes.js';
import progressRoutes from './progress.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import systemRoutes from './system.routes.js';

const api = Router();

api.use('/auth', authRoutes);
api.use('/subjects', subjectRoutes);
api.use('/units', unitRoutes);
api.use('/topics', topicRoutes);
api.use('/notes', noteRoutes);
api.use('/chat', chatRoutes);
api.use('/conversations', conversationRoutes);
api.use('/quizzes', quizRoutes);
api.use('/progress', progressRoutes);
api.use('/recommendations', recommendationRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/', systemRoutes);

export default api;
