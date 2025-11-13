---
name: project-documentation-writer
description: Generate comprehensive, beautifully formatted documentation for code, APIs, projects, and technical content. Use when user asks to document code, create README files, write API docs, generate technical documentation, or wants professional markdown formatting.
---

# Project Documentation Writer

## Instructions

1. **Analyze the content** - Understand code structure, purpose, and audience
2. **Choose appropriate format** - README, API docs, guides, or reference docs
3. **Generate well-structured markdown** with:
   - Clear headings hierarchy (H1 → H6)
   - Code blocks with language tags
   - Tables for structured data
   - Badges and shields for status/versions
   - Proper lists and formatting
   - Examples and usage sections

## Documentation Formats

### README.md Structure
```markdown
# Project Name

Brief, compelling description

## Features
- Feature 1
- Feature 2

## Installation
```bash
npm install package-name
```

## Usage
```javascript
const example = require('package-name');
```

## API Reference
Link to detailed docs

## Contributing
Guidelines for contributors

## License
MIT
```

### API Documentation
```markdown
## `functionName(param1, param2)`

Brief description of what the function does.

### Parameters
| Name | Type | Description |
|------|------|-------------|
| param1 | string | Description |
| param2 | number | Description |

### Returns
`Promise<Object>` - Description of return value

### Example
```javascript
const result = await functionName('value', 42);
console.log(result);
```
```

### Code Documentation
- Use JSDoc, docstrings, or language-appropriate formats
- Include parameter types and descriptions
- Add usage examples
- Document edge cases and errors

## Formatting Best Practices

- **Always tag code blocks** with language (```javascript, ```python, etc.)
- Use tables for structured information
- Add badges for build status, version, license
- Include table of contents for long docs
- Use admonitions (> **Note:**) for important info
- Keep line length reasonable (80-100 chars)
- Use relative links for internal navigation

## Examples

### Beautiful README Badge Section
```markdown
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
```

### Professional API Table
```markdown
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | Retrieve all users |
| `/api/users/:id` | GET | Get user by ID |
| `/api/users` | POST | Create new user |
```
