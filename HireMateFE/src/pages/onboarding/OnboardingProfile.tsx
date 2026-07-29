import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { User, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingService, profileService } from '../../services';
import { ONBOARDING_REDIRECT_KEY } from '../../components/common/RequirePremium';

export const OnboardingProfile: React.FC = () => {
  const { profile, updateProfile } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState(profile.name || '');

  useEffect(() => {
    if (profile.name) {
      setName(profile.name);
    }
  }, [profile.name]);

  useEffect(() => {
    const r = searchParams.get('redirect');
    if (r && r.startsWith('/')) {
      sessionStorage.setItem(ONBOARDING_REDIRECT_KEY, r);
    }
  }, [searchParams]);

  const [bio, setBio] = useState(
    profile.bio ||
      'Tôi là một kỹ sư phần mềm có đam mê với phát triển sản phẩm thực tế.'
  );
  const [hobbies, setHobbies] = useState<string[]>(
    profile.hobbies && profile.hobbies.length
      ? profile.hobbies
      : ['Đọc sách', 'Viết blog kỹ thuật', 'Chạy bộ']
  );
  const [hobbyInput, setHobbyInput] = useState('');

  const handleAddHobby = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = hobbyInput.trim();
      if (val && !hobbies.includes(val)) {
        setHobbies([...hobbies, val]);
        setHobbyInput('');
      }
    }
  };

  const handleRemoveHobby = (tagToRemove: string) => {
    setHobbies(hobbies.filter((tag) => tag !== tagToRemove));
  };

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fullName = name.trim() || profile.name || 'Người dùng HireMate';
    const next = {
      name: fullName,
      bio: bio.trim(),
      hobbies,
    };
    // Chỉ cập nhật local — tránh AppContext gọi PUT /Profile đè mất University
    updateProfile(next, { skipApi: true });

    if (sessionStorage.getItem('hm_access_token')) {
      setSaving(true);
      try {
        const year = new Date().getFullYear() + 1;
        const personal = await onboardingService.savePersonal({
          fullName,
          university: 'Chưa cập nhật',
          major: 'Chưa cập nhật',
          graduationYear: year,
        });
        if (!personal.ok) {
          setError(personal.message || 'Không lưu được thông tin cá nhân');
          setSaving(false);
          return;
        }
        // Bio/hobbies nằm ở Profile API (không có trong Onboarding/personal)
        const profileRes = await profileService.updateProfile({
          name: fullName,
          bio: next.bio,
          hobbies: next.hobbies,
          university: 'Chưa cập nhật',
          major: 'Chưa cập nhật',
          graduationYear: year,
        });
        if (!profileRes.ok) {
          setError(profileRes.message || 'Không lưu được hồ sơ');
          setSaving(false);
          return;
        }
      } catch (err: any) {
        setError(err?.message || 'Lỗi kết nối API');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    navigate('/onboarding/goal');
  };

  return (
    <div className="section container" style={{ maxWidth: '640px', margin: '30px auto' }}>
      <div className="card" style={{ padding: '36px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span className="badge badge--success">Bước 1 / 3</span>
          <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Hồ sơ cá nhân
          </span>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h2>Chào bạn! Hãy giới thiệu về bản thân</h2>
          <p className="muted">
            Thông tin này giúp AI hiểu bối cảnh và cá nhân hóa câu hỏi phỏng vấn cho bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="name" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Họ và tên của bạn
            </label>
            <input
              id="name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="bio" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Giới thiệu ngắn (Bio)
            </label>
            <textarea
              id="bio"
              className="form-control"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Chia sẻ kinh nghiệm làm việc và định hướng nghề nghiệp..."
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="hobby" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Sở thích / Kỹ năng nổi bật (Nhấn Enter để thêm)
            </label>
            <input
              id="hobby"
              type="text"
              className="form-control"
              placeholder="Ví dụ: Lập trình React, Làm việc nhóm..."
              value={hobbyInput}
              onChange={(e) => setHobbyInput(e.target.value)}
              onKeyDown={handleAddHobby}
            />

            <div
              className="tags"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '12px',
              }}
            >
              <AnimatePresence>
                {hobbies.map((tag) => (
                  <motion.span
                    key={tag}
                    className="tag"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label="Xóa"
                      onClick={() => handleRemoveHobby(tag)}
                    >
                      <X size={14} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {error && (
            <p style={{ color: '#EF4444', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={saving}
          >
            {saving ? 'Đang lưu…' : 'Tiếp tục'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
