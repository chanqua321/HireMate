const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://localhost:7080/api';

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const client = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, raw: data });
        }
      });
    });

    client.on('error', reject);
    if (body) {
      client.write(JSON.stringify(body));
    }
    client.end();
  });
}

async function main() {
  console.log('--- BƯỚC 1: ĐĂNG NHẬP ỨNG VIÊN ---');
  let loginRes = await req('POST', '/Auth/login', { email: 'student@hiremate.local', password: 'Password1' });
  let token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;

  if (!token) {
    console.log('Login student failed, trying to register a candidate account...');
    const candidateEmail = `test_candidate_${Date.now()}@hiremate.local`;
    const regRes = await req('POST', '/Auth/register', {
      email: candidateEmail,
      password: 'Password@123',
      fullName: 'Ứng Viên Test Trượt',
      role: 'User'
    });
    token = regRes.data?.data?.token || regRes.data?.data?.accessToken;
  }

  if (!token) {
    console.error('Không thể lấy token ứng viên:', loginRes);
    return;
  }
  console.log('Đăng nhập thành công, token:', token.slice(0, 20) + '...');

  console.log('\n--- BƯỚC 1.5: ADMIN CẤP QUYỀN PREMIUM CHO TEST CANDIDATE ---');
  const adminLogin = await req('POST', '/Auth/login', { email: 'admin@gmail.com', password: '12345' });
  const adminToken = adminLogin.data?.data?.token || adminLogin.data?.data?.accessToken;
  if (adminToken) {
    const usersRes = await req('GET', '/Admin/users?q=student@hiremate.local', null, adminToken);
    const studentUser = (usersRes.data?.data || [])[0];
    if (studentUser) {
      console.log(`Tìm thấy user ${studentUser.email} (ID: ${studentUser.id}). Cấp Premium...`);
      const patchRes = await req('PATCH', `/Admin/users/${studentUser.id}`, { isPremium: true }, adminToken);
      console.log('Kết quả cấp Premium:', patchRes.status);
    }
  }

  // Re-login student to get updated claims if needed
  loginRes = await req('POST', '/Auth/login', { email: 'student@hiremate.local', password: 'Password1' });
  token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;

  console.log('\n--- BƯỚC 2: TẠO PHIÊN PHỎNG VẤN THỬ NGHIỆM ---');
  const sessionRes = await req('POST', '/Interview/sessions', {
    industry: 'Công nghệ thông tin',
    position: 'Lập trình viên Frontend',
    difficulty: 'Trung bình',
    mode: 'Text',
    questionCount: 3
  }, token);

  console.log('Session creation response:', JSON.stringify(sessionRes.data, null, 2));
  const sessionId = sessionRes.data?.data?.id || sessionRes.data?.data?.sessionId || sessionRes.data?.id;
  console.log('Phiên phỏng vấn đã tạo ID:', sessionId);

  console.log('\n--- BƯỚC 3: LẤY CÂU HỎI TỪ AI ---');
  const qRes = await req('GET', `/Interview/sessions/${sessionId}/questions`, null, token);
  const questions = qRes.data?.data || [];
  console.log(`Nhận được ${questions.length} câu hỏi:`);
  questions.forEach((q, idx) => {
    console.log(`  [Câu ${idx + 1}]: ${q.content}`);
  });

  console.log('\n--- BƯỚC 4: GỬI CÂU TRẢ LỜI 100% BỎ QUA (SKIPPED) ---');
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`-> Bỏ qua câu ${i + 1} (skipped = true)...`);
    const ansRes = await req('POST', `/Interview/sessions/${sessionId}/answers`, {
      orderIndex: q.orderIndex ?? i + 1,
      questionId: q.questionId,
      questionText: q.content,
      answerText: '',
      skipped: true,
      durationSec: 1
    }, token);
    console.log(`   Kết quả nộp: status ${ansRes.status}`);
  }

  console.log('\n--- BƯỚC 5: HOÀN THÀNH PHIÊN VÀ KÍCH HOẠT CHẤM ĐIỂM AI ---');
  const completeRes = await req('POST', `/Interview/sessions/${sessionId}/complete`, null, token);
  console.log('Hoàn thành phiên, status:', completeRes.status);

  console.log('\n--- BƯỚC 6: TRUY VẤN KẾT QUẢ REAL DATA CỦA PHIÊN PHỎNG VẤN TRƯỢT ---');
  const detailRes = await req('GET', `/Interview/sessions/${sessionId}`, null, token);
  const detail = detailRes.data?.data;

  console.log('====================================================');
  console.log('REAL DATA KẾT QUẢ PHỎNG VẤN TRƯỢT (FAILING INTERVIEW):');
  console.log('====================================================');
  console.log(`Session ID:        ${detail?.id}`);
  console.log(`Vị trí:            ${detail?.position} (${detail?.industry})`);
  console.log(`Trạng thái:        ${detail?.status}`);
  console.log(`TỔNG ĐIỂM (OVERALL): ${detail?.overallScore}/100  <-- ĐIỂM KÉM (< 50, FAILED)`);
  console.log(`STAR Break Down:`);
  console.log(`   - S (Situation):  ${detail?.scoreS}/100`);
  console.log(`   - T (Task):       ${detail?.scoreT}/100`);
  console.log(`   - A (Action):     ${detail?.scoreA}/100`);
  console.log(`   - R (Result):     ${detail?.scoreR}/100`);
  console.log(`   - Clarity:        ${detail?.clarityScore}/100`);
  console.log(`Nhận xét tổng quát:`);
  console.log(`"${detail?.feedbackSummary}"`);
  console.log('====================================================');

  console.log('\n--- BƯỚC 7: KIỂM TRA API GAMIFICATION VÀ ADMIN INTERVIEWS ---');
  if (adminToken) {
    const adminIntRes = await req('GET', '/Admin/interviews', null, adminToken);
    console.log('Admin Interviews API stats:', adminIntRes.data?.data);

    const badgesRes = await req('GET', '/Gamification/badges', null, adminToken);
    console.log(`Gamification Badges count: ${badgesRes.data?.data?.length || 0}`);

    const lbRes = await req('GET', '/Gamification/leaderboard', null, adminToken);
    console.log(`Gamification Leaderboard count: ${lbRes.data?.data?.length || 0}`);
  }
}

main().catch(console.error);
