# Contributing to DeepSweep.ai Auditor

Thank you for your interest in contributing to DeepSweep.ai Auditor! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on our [GitHub Issues](https://github.com/deepsweep-ai/auditor/issues) page with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)
- Any relevant logs or screenshots

### Suggesting Enhancements

We welcome suggestions for new features or improvements! Please open an issue with:

- A clear description of the enhancement
- Use cases and examples
- Any implementation ideas you might have

### Pull Requests

1. **Fork the repository** and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Make your changes**:
   - Write clear, readable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Follow conventional commits format (e.g., `feat:`, `fix:`, `docs:`)

   ```bash
   git commit -m "feat: add new detection pattern for XYZ"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**:
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots/examples if applicable

## CLI Command

The package provides the `dsauditor` command when installed via npm or npx.

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code formatting (enforced by Prettier)
- Use meaningful variable and function names
- Add comments for complex logic

### Testing

- Write unit tests for new detectors
- Test edge cases and error conditions
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage

### Detector Development

When adding new security detectors:

1. Create a new file in `src/detectors/`
2. Implement the `Detector` interface
3. Add comprehensive tests in `src/detectors/__tests__/`
4. Update documentation with detection details
5. Add to the detector registry in `src/detectors/index.ts`

Example detector structure:

```typescript
import type { Detector, MCPSession, Finding } from '../types/index.js';

export const MyDetector: Detector = {
  name: 'MyDetector',
  category: 'memory_poisoning', // or 'tool_poisoning'

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Your detection logic here

    return findings;
  },
};
```

### Documentation

- Update README.md if adding user-facing features
- Add JSDoc comments for public APIs
- Include examples in documentation
- Keep documentation clear and concise

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept responsibility for mistakes

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Other unprofessional conduct

## Questions?

- Open an issue for general questions
- Join our [Discord community](https://discord.gg/Db5Zth2RKR)
- Check existing issues and pull requests

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make DeepSweep.ai Auditor better for everyone!
