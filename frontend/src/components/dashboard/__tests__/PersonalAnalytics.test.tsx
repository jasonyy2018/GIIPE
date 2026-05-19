import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonalAnalytics from '../PersonalAnalytics';
import { userStatsService } from '../../../services/userStatsService';

// Mock the userStatsService
jest.mock('../../../services/userStatsService', () => ({
  userStatsService: {
    getUserAnalytics: jest.fn(),
    clearCache: jest.fn(),
  },
}));

const mockAnalytics = {
  userId: 'test-user',
  period: 'monthly' as const,
  metrics: {
    pageViews: 245,
    eventRegistrations: 4,
    contentSaves: 12,
    networkConnections: 8,
    timeSpent: 1440,
  },
  trends: {
    engagement: {
      current: 89,
      previous: 76,
      change: 13,
      changePercent: 17.1,
    },
    activity: {
      current: 32,
      previous: 28,
      change: 4,
      changePercent: 14.3,
    },
    growth: {
      current: 156,
      previous: 148,
      change: 8,
      changePercent: 5.4,
    },
  },
};

describe('PersonalAnalytics', () => {
  beforeEach(() => {
    (userStatsService.getUserAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders analytics overview by default', async () => {
    render(<PersonalAnalytics userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Personal Analytics')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Detailed')).toBeInTheDocument();
    });
  });

  it('displays key metrics correctly', async () => {
    render(<PersonalAnalytics userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('245')).toBeInTheDocument(); // Page Views
      expect(screen.getByText('4')).toBeInTheDocument(); // Registrations
      expect(screen.getByText('8')).toBeInTheDocument(); // Connections
    });
  });

  it('switches between overview and detailed views', async () => {
    render(<PersonalAnalytics userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Personal Analytics')).toBeInTheDocument();
    });

    // Switch to detailed view
    const detailedButton = screen.getByText('Detailed');
    fireEvent.click(detailedButton);

    await waitFor(() => {
      expect(screen.getByText('Activity Trends')).toBeInTheDocument();
      expect(screen.getByText('Activity Distribution')).toBeInTheDocument();
    });
  });

  it('shows and hides filters panel', async () => {
    render(<PersonalAnalytics userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Personal Analytics')).toBeInTheDocument();
    });

    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByText('Date Range')).toBeInTheDocument();
      expect(screen.getByText('Metrics')).toBeInTheDocument();
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
    });
  });

  it('renders compact view when compact prop is true', async () => {
    render(<PersonalAnalytics userId="test-user" compact={true} />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Summary')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument(); // Engagement score
      expect(screen.getByText('245')).toBeInTheDocument(); // Page views
    });
  });

  it('handles period changes', async () => {
    render(<PersonalAnalytics userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Personal Analytics')).toBeInTheDocument();
    });

    // Change period to weekly
    const periodSelect = screen.getByDisplayValue('Monthly');
    fireEvent.change(periodSelect, { target: { value: 'weekly' } });

    await waitFor(() => {
      expect(userStatsService.getUserAnalytics).toHaveBeenCalledWith('test-user', 'weekly');
    });
  });

  it('displays insights and recommendations', async () => {
    render(<PersonalAnalytics userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Insights & Recommendations')).toBeInTheDocument();
      expect(screen.getByText(/Great job! Your engagement has increased/)).toBeInTheDocument();
    });
  });
});