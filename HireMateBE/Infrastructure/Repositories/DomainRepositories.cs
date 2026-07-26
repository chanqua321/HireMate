using Infrastructure.Base;
using Infrastructure.Data;
using Infrastructure.IRepositories;
using Infrastructure.Models;

namespace Infrastructure.Repositories;

public class CareerProfileRepository(HireMateContext context)
    : GenericRepository<CareerProfile>(context), ICareerProfileRepository { }

public class QuestionRepository(HireMateContext context)
    : GenericRepository<Question>(context), IQuestionRepository { }

public class InterviewSessionRepository(HireMateContext context)
    : GenericRepository<InterviewSession>(context), IInterviewSessionRepository { }

public class InterviewAnswerRepository(HireMateContext context)
    : GenericRepository<InterviewAnswer>(context), IInterviewAnswerRepository { }

public class CareerMemoryEventRepository(HireMateContext context)
    : GenericRepository<CareerMemoryEvent>(context), ICareerMemoryEventRepository { }
