using Infrastructure.Base;
using Infrastructure.Models;

namespace Infrastructure.IRepositories;

public interface ICareerProfileRepository : IGenericRepository<CareerProfile> { }
public interface IQuestionRepository : IGenericRepository<Question> { }
public interface IInterviewSessionRepository : IGenericRepository<InterviewSession> { }
public interface IInterviewAnswerRepository : IGenericRepository<InterviewAnswer> { }
public interface ICareerMemoryEventRepository : IGenericRepository<CareerMemoryEvent> { }
