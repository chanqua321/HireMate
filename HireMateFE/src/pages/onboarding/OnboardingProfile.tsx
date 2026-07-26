import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { User, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OnboardingProfile: React.FC = () => {
  const { profile, updateProfile } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState(profile.name || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || profile.name,
      bio: bio.trim(),
      hobbies,
    });
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

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Tiếp tục <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
