from pathlib import Path
import re

p = Path(r"D:\EXE101\HireMateFE\src\features\interview\components\InterviewSetup\InterviewSetup.tsx")
text = p.read_text(encoding="utf-8")

old_start = text.find("  // Hydrate plan + Active CV from backend (SoT). localStorage only seeds UI until this resolves.")
if old_start < 0:
    raise SystemExit("start marker not found")

# Find end: closing of this useEffect then blank line before next const/state
m = re.search(r"\}, \[\]);\r?\n\r?\n  const \[", text[old_start:])
if not m:
    raise SystemExit("end marker not found")
old_end = old_start + m.start() + len(m.group(0)) - len("  const [")

new_block = r'''  // Hydrate plan + Active CV from backend (SoT). fromCv is operation pick only — never activate.
  useEffect(() => {
    if (cvFromState?.id) {
      setSelectedOpCvId(String(cvFromState.id));
      const f = normalizeIndustry(cvFromState.field);
      const r = normalizeRole(cvFromState.role, f);
      setField(f);
      setRole(r);
      updateInterviewConfig({ field: f, role: r });
    }

    if (!localStorage.getItem('hm_access_token')) return;

    let cancelled = false;

    (async () => {
      try {
        const me = await authService.getMe();
        if (!cancelled && me.ok && me.data) {
          const code = String(
            (me.data as any).currentPlanCode || (me.data as any).CurrentPlanCode || 'free'
          ).toLowerCase();
          setRuntimePlanCode(code || 'free');
        }
      } catch {
        /* ignore — keep cached plan */
      }

      try {
        const [hubRes, cvRes] = await Promise.all([
          careerService.getProfileHub(),
          cvService.listCvs(),
        ]);
        if (cancelled) return;

        const hub: any = hubRes.ok ? hubRes.data : null;
        const cp = hub?.profile;
        const confirmedId = String(
          cp?.confirmedCvDocumentId || cp?.ConfirmedCvDocumentId || ''
        ).trim();

        if (cp) {
          const pos = cp.desiredPosition || cp.DesiredPosition || '';
          const ind = cp.desiredIndustry || cp.DesiredIndustry || '';
          if (pos || ind) {
            const f = normalizeIndustry(ind || field);
            const r = normalizeRole(pos || role, f);
            setField(f);
            setRole(r);
            updateInterviewConfig({ field: f, role: r });
          }
          try {
            const rawSkills = cp.skillsJson || cp.skills || cp.SkillsJson;
            if (typeof rawSkills === 'string') setCareerSkills(JSON.parse(rawSkills));
            else if (Array.isArray(rawSkills)) setCareerSkills(rawSkills);
          } catch {}
          if (cp.experienceLevel || cp.ExperienceLevel) {
            setCareerExp(cp.experienceLevel || cp.ExperienceLevel);
          }
          if (cp.university || cp.University) {
            setCareerUniversity(cp.university || cp.University);
          }
        }
        if (typeof hub?.sessionsCount === 'number') setCareerSessionsCount(hub.sessionsCount);

        const cvs = cvRes.ok && Array.isArray(cvRes.data) ? cvRes.data : [];
        setCvOptions(
          cvs.map((c: any) => ({
            id: String(c.id),
            title:
              c.displayName ||
              c.DisplayName ||
              c.fileName ||
              c.parsedProfile?.desiredPosition ||
              'CV',
            role: c.targetRole || c.parsedProfile?.desiredPosition || '',
            field: c.targetField || '',
            parseSucceeded: !!c.parseSucceeded,
          }))
        );

        const activeDto =
          (confirmedId && cvs.find((c) => String(c.id) === confirmedId)) ||
          cvs.find((c) => c.isConfirmed || c.isActive) ||
          null;

        if (activeDto) {
          const display =
            (activeDto as any).displayName ||
            (activeDto as any).DisplayName ||
            activeDto.fileName ||
            activeDto.parsedProfile?.desiredPosition ||
            'CV đang dùng';
          const mapped = {
            id: activeDto.id,
            title: display,
            fileName: activeDto.fileName || '',
            role:
              activeDto.targetRole ||
              activeDto.parsedProfile?.desiredPosition ||
              cp?.desiredPosition ||
              '',
            field:
              activeDto.targetField ||
              cp?.desiredIndustry ||
              '',
            parseSucceeded: activeDto.parseSucceeded,
          };
          setBackendActiveCvId(String(activeDto.id));
          setActiveCvInfo(mapped);
          try {
            localStorage.setItem('hm_active_cv_id', String(activeDto.id));
            localStorage.setItem('hm_active_cv', JSON.stringify(mapped));
          } catch {}
          if (!cvFromState?.id) {
            setSelectedOpCvId('');
          }
          if (!cvFromState && (mapped.role || mapped.field)) {
            const f = normalizeIndustry(mapped.field || field);
            const r = normalizeRole(mapped.role || role, f);
            setField(f);
            setRole(r);
            updateInterviewConfig({ field: f, role: r });
          }
        } else {
          setBackendActiveCvId(confirmedId || null);
          setActiveCvInfo(null);
          try {
            localStorage.removeItem('hm_active_cv_id');
            localStorage.removeItem('hm_active_cv');
          } catch {}
        }
      } catch {
        /* keep UI usable */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

'''

text = text[:old_start] + new_block + text[old_end:]

# Replace CV banner link section with selector
banner_old = '''                <Link
                  to="/dashboard?tab=scan"
                  style={{
                    color: '#0284C7',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#E0F2FE',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}
                  title="Chọn một CV khác trong kho CV của bạn"
                >
                  <span>Đổi CV khác</span>
                  <ArrowRight size={13} />
                </Link>'''

banner_new = '''                <select
                  value={
                    selectedOpCvId ||
                    (backendActiveCvId ? '' : '')
                  }
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedOpCvId(id);
                    const opt = cvOptions.find((c) => c.id === id);
                    if (opt?.role || opt?.field) {
                      const f = normalizeIndustry(opt.field || field);
                      const r = normalizeRole(opt.role || role, f);
                      setField(f);
                      setRole(r);
                      updateInterviewConfig({ field: f, role: r });
                    }
                  }}
                  style={{
                    maxWidth: 280,
                    fontSize: '0.82rem',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1.5px solid #BAE6FD',
                    color: '#0F172A',
                    background: '#fff',
                  }}
                  title="CV cho phiên phỏng vấn (không đổi Active CV)"
                >
                  <option value="">
                    {backendActiveCvId
                      ? `🎯 Active: ${activeCvInfo?.title || 'CV đang dùng'}`
                      : '— Chọn CV —'}
                  </option>
                  {cvOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id === backendActiveCvId ? `🎯 [Active] ${c.title}` : c.title}
                    </option>
                  ))}
                </select>'''

if banner_old not in text:
    raise SystemExit("banner block not found")
text = text.replace(banner_old, banner_new, 1)

p.write_text(text, encoding="utf-8")
print("OK")
