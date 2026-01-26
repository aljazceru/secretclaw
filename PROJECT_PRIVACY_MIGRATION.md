# Privacy-Focused Migration Project

## Project Overview
This project implements four major privacy and security enhancements to Clawdbot:

1. **System Package Manager Migration**: Replace Homebrew with apt/dnf for dependency management
2. **RedPill.ai TEE Provider**: Add confidential computing inference backend
3. **Local Whisper Prioritization**: Make local speech recognition the default
4. **Qwen3-TTS Integration**: Replace ElevenLabs with self-hosted TTS

## Implementation Status

### Phase 1: Foundation (System Package Manager + RedPill Provider)
- [ ] Task 1.1: Implement system package manager detection and resolution
- [ ] Task 1.2: Update skills installer to support apt/dnf
- [ ] Task 1.3: Create package mapping table
- [ ] Task 1.4: Add RedPill.ai provider configuration
- [ ] Task 1.5: Implement RedPill auth handler
- [ ] Task 1.6: Add RedPill models to provider list

### Phase 2: Voice Processing (Whisper + Qwen3-TTS)
- [ ] Task 2.1: Update Whisper detection to prioritize local
- [ ] Task 2.2: Add local Whisper configuration options
- [ ] Task 2.3: Implement Qwen3-TTS provider module
- [ ] Task 2.4: Add Qwen3 configuration types
- [ ] Task 2.5: Integrate Qwen3 into TTS pipeline
- [ ] Task 2.6: Create Qwen3-TTS skill definition

### Phase 3: Skill Migration (25 Skills)
- [ ] Task 3.1: Migrate all brew-based skills to system package manager
- [ ] Task 3.2: Test skill installation on Debian/Ubuntu (apt)
- [ ] Task 3.3: Test skill installation on Fedora/RHEL (dnf)
- [ ] Task 3.4: Update skill documentation

### Phase 4: Infrastructure Updates
- [ ] Task 4.1: Update Docker sandbox setup script
- [ ] Task 4.2: Update PATH environment handling
- [ ] Task 4.3: Add deprecation warnings for Homebrew
- [ ] Task 4.4: Update configuration schema

### Phase 5: Testing & Documentation
- [ ] Task 5.1: Write unit tests for all new modules
- [ ] Task 5.2: Run integration tests
- [ ] Task 5.3: Update all documentation
- [ ] Task 5.4: Create migration guide
- [ ] Task 5.5: Add changelog entries

## Quality Gates

Each component must pass:
1. ✅ Code implementation complete (no TODOs, placeholders, or mockups)
2. ✅ Unit tests written and passing
3. ✅ QA review approved
4. ✅ Integration testing passed
5. ✅ Documentation updated

## Files Created/Modified Tracker

### New Files
- [ ] `src/infra/pkg.ts` - System package manager support
- [ ] `src/infra/pkg.test.ts` - Package manager tests
- [ ] `src/agents/models-config.providers.redpill.ts` - RedPill provider
- [ ] `src/commands/auth-choice.apply.redpill.ts` - RedPill auth handler
- [ ] `src/tts/providers/qwen3.ts` - Qwen3-TTS provider
- [ ] `src/tts/providers/qwen3.test.ts` - Qwen3-TTS tests
- [ ] `skills/qwen3-tts/SKILL.md` - Qwen3-TTS skill definition
- [ ] `docs/providers/redpill.md` - RedPill documentation
- [ ] `docs/migration/privacy-2026.md` - Migration guide

### Modified Files
- [ ] `src/agents/skills-install.ts` - Add system package manager logic
- [ ] `src/config/types.skills.ts` - Add package manager config
- [ ] `src/config/types.tts.ts` - Add Qwen3 config types
- [ ] `src/media-understanding/runner.ts` - Prioritize local Whisper
- [ ] `src/media-understanding/defaults.ts` - Add preferLocal setting
- [ ] `src/agents/models-config.providers.ts` - Register RedPill provider
- [ ] `src/commands/auth-choice.apply.ts` - Register RedPill handler
- [ ] `src/commands/auth-choice-options.ts` - Add RedPill auth option
- [ ] `src/tts/tts.ts` - Integrate Qwen3 provider
- [ ] `scripts/sandbox-common-setup.sh` - Replace Linuxbrew with apt/dnf
- [ ] 25 skill files - Migrate to system package manager

## Current Sprint

**Sprint Goal**: Complete Phase 1 (Foundation)
**Status**: In Progress
**Blockers**: None
**Next Review**: After Task 1.6 completion

## Notes
- All implementations must be production-ready (no placeholders)
- Every code change requires corresponding test coverage
- QA review required before marking any task complete
- No feature flags - direct implementation with proper fallbacks
