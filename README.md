# GitFlux

**Comprehensive GitHub Repository Analytics Platform**

GitFlux is a powerful, open-source web application that transforms GitHub repository data into actionable insights. Built with modern web technologies, it provides developers, project managers, and teams with deep analytics about their repositories, including commit patterns, contributor activity, branch statistics, and code churn analysis.

## ✨ Key Features

### 📊 Repository Analytics
- **Comprehensive Repository Analysis**: Deep dive into any GitHub repository with detailed metrics and visualizations
- **Commit Activity Tracking**: Visualize commit patterns over time with interactive charts
- **Contributor Insights**: Analyze contributor activity, trends, and collaboration patterns

### 📈 Advanced Visualizations
- **Weekly Commit Heatmaps**: GitHub-style activity grids showing when your team is most productive
- **Contributor Trendlines**: Track individual contributor momentum and identify activity changes
- **Branch & PR Statistics**: Understand branching patterns, merge frequency, and code review effectiveness
- **File Change Analysis**: Identify high-churn files and potential refactoring candidates

### 🔍 Detailed Analytics
- **Branch Statistics**: Active, merged, and stale branch analysis with commit counts
- **Pull Request Metrics**: PR lifecycle analysis, review times, and collaboration patterns
- **Code Review Analytics**: Review response times, approval patterns, and reviewer activity
- **File Churn Analysis**: Most frequently changed files with trend analysis and file type breakdowns

### 🎯 Smart Filtering
- **Time Range Controls**: Analyze data across different periods (30 days, 3 months, 6 months, 1 year, all time)
- **Interactive Filtering**: Focus on specific contributors, file types, or activity patterns
- **Real-time Updates**: Dynamic data updates as you adjust filters and time ranges

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-username]/gitflux.git
   cd gitflux
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables** (optional)
   ```bash
   # For enhanced GitHub API access (higher rate limits)
   echo "GITHUB_TOKEN=your_github_personal_access_token" > .env.local
   ```

4. **Start the development server**
   ```bash
   bun dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) and start analyzing GitHub repositories!

## 🎯 Usage

### Analyzing a Repository

1. **Navigate to the analyzer**: Visit `/analyze/[owner]/[repo]` or use the repository form
2. **Enter repository details**: Input a GitHub repository URL (e.g., `github.com/facebook/react`)
3. **Explore the analytics**: 
   - View commit activity charts and contributor insights
   - Analyze weekly commit heatmaps to understand productivity patterns
   - Track contributor trends and identify activity changes
   - Examine branch statistics and pull request metrics
   - Discover most frequently changed files and potential refactoring candidates

### Example URLs
- **React Repository**: `/analyze/facebook/react`
- **Vue.js Repository**: `/analyze/vuejs/vue`
- **Node.js Repository**: `/analyze/nodejs/node`

### Features Overview

#### Repository Analysis
- **Commit History**: Interactive charts showing commit activity over time
- **Contributors**: Ranked list of contributors with activity metrics
- **Repository Stats**: Stars, forks, language, and creation date

#### Activity Visualizations  
- **Weekly Heatmap**: GitHub-style grid showing commit patterns by day of week
- **Contributor Trends**: Line charts tracking individual contributor momentum
- **Time Range Filtering**: Analyze data across different periods

#### Branch & PR Analytics
- **Branch Statistics**: Active, merged, and stale branch analysis
- **Pull Request Metrics**: PR lifecycle, review times, and merge patterns
- **Code Review Analytics**: Review response times and approval patterns

#### File Change Analysis
- **Most Changed Files**: Identify high-churn areas of the codebase
- **File Type Breakdown**: Understand which types of files are most volatile
- **Change Trends**: Visualize file modification patterns over time

## 🛠️ Development

### Available Scripts

```bash
# Development
bun dev          # Start development server with Turbopack
bun build        # Create production build
bun start        # Start production server

# Code Quality
bun lint         # Run ESLint checks
bun test         # Run tests with Vitest
```

### Project Structure

```
├── src/
│   ├── app/
│   │   ├── analyze/[owner]/[repo]/  # Repository analysis pages
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Home page
│   ├── components/
│   │   ├── CommitChart.tsx          # Commit activity visualizations
│   │   ├── Contributors.tsx         # Contributor analysis
│   │   ├── CommitActivityHeatmap.tsx # Weekly activity heatmaps
│   │   ├── ContributorTrendlines.tsx # Contributor trend analysis
│   │   └── RepoForm.tsx             # Repository input form
│   └── lib/
│       ├── github-api.ts            # GitHub API integration
│       └── utils.ts                 # Utility functions
├── public/                          # Static assets
├── .kiro/
│   ├── specs/                       # Feature specifications
│   └── steering/                    # Development guidelines
└── ...config files
```

### Tech Stack

- **Framework**: Next.js 15.4.1 with App Router
- **Frontend**: React 19.1.0, TypeScript 5
- **Styling**: Tailwind CSS v4, PostCSS
- **Charts**: Recharts for interactive data visualizations
- **API Integration**: GitHub REST API v3
- **Testing**: Vitest, Testing Library, Jest DOM
- **Linting**: ESLint 9
- **Package Manager**: Bun
- **Fonts**: Geist Sans & Mono

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a new branch** for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit them
5. **Push to your fork** and submit a pull request

### Contribution Guidelines

- **Code Style**: Follow the existing code style and run `bun lint` before submitting
- **Testing**: Add tests for new features and ensure existing tests pass
- **Documentation**: Update documentation for any new features or changes
- **Commit Messages**: Use clear, descriptive commit messages
- **Pull Requests**: Provide a clear description of your changes

### Types of Contributions

- 🐛 **Bug Reports**: Found a bug? Open an issue with details
- 💡 **Feature Requests**: Have an idea? We'd love to hear it
- 📝 **Documentation**: Help improve our docs
- 🧪 **Testing**: Add or improve tests
- 🎨 **UI/UX**: Enhance the user interface and experience
- 📊 **Analytics Features**: Contribute new visualization components or metrics
- 🔧 **API Integrations**: Help extend support to other Git platforms

## ⚙️ Configuration

### GitHub API Setup

GitFlux uses the GitHub REST API to fetch repository data. While it works without authentication, setting up a personal access token provides higher rate limits and access to private repositories.

#### Creating a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `public_repo` (for public repository access)
   - `repo` (for private repository access, if needed)
4. Copy the generated token
5. Add it to your `.env.local` file:
   ```bash
   GITHUB_TOKEN=your_github_personal_access_token
   ```

#### Rate Limits
- **Without token**: 60 requests per hour
- **With token**: 5,000 requests per hour
- GitFlux implements intelligent caching and rate limit handling to optimize API usage

## 📋 Roadmap

### 🚧 In Development
- [ ] **GitHub Repository Analyzer** - Core repository analysis with commit charts and contributor insights
- [ ] **Commit Activity Visualizations** - Weekly heatmaps and contributor trendlines
- [ ] **Branch & PR Statistics** - Comprehensive branch activity and pull request analytics
- [ ] **Most Changed Files Analysis** - File churn analysis with trend visualization

### 🔮 Planned Features
- [ ] **Multi-Repository Dashboards** - Compare and analyze multiple repositories
- [ ] **Team Performance Metrics** - Advanced team productivity analytics
- [ ] **Custom Report Generation** - Export and share analytics reports
- [ ] **GitHub Integration** - Direct GitHub app integration for enhanced data access
- [ ] **Real-time Notifications** - Activity alerts and trend notifications
- [ ] **API Access** - RESTful API for programmatic access to analytics

### 🎯 Future Enhancements
- [ ] **GitLab Support** - Extend analytics to GitLab repositories
- [ ] **Bitbucket Integration** - Support for Bitbucket repositories
- [ ] **Advanced ML Insights** - Predictive analytics and anomaly detection
- [ ] **Custom Metrics** - User-defined analytics and KPIs

## 🐛 Issues

If you encounter any issues or have suggestions, please:

1. Check existing [issues](https://github.com/[your-username]/gitflux/issues)
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Node version)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Fonts by [Vercel](https://vercel.com/font)
- Testing with [Vitest](https://vitest.dev/)

## 📞 Support

- **Documentation**: Check our docs and README
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Join our GitHub Discussions for questions and ideas

---

**Made with ❤️ by the GitFlux community**
