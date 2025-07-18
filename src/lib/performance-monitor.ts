/**
 * Performance monitoring utilities for branch/PR analytics
 * Provides memory usage tracking, performance metrics, and optimization suggestions
 */

export interface PerformanceMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    memoryUsage?: {
        initial: number;
        peak: number;
        final: number;
    };
    dataPoints: number;
    apiCalls: number;
    rateLimitHits: number;
    errors: number;
    retries: number;
}

export interface OptimizationSuggestion {
    type: 'memory' | 'api' | 'performance' | 'scope';
    severity: 'low' | 'medium' | 'high';
    message: string;
    action?: string;
}

export class PerformanceMonitor {
    private metrics: PerformanceMetrics;
    private memoryCheckInterval?: NodeJS.Timeout;
    private peakMemoryUsage = 0;

    constructor() {
        this.metrics = {
            startTime: Date.now(),
            dataPoints: 0,
            apiCalls: 0,
            rateLimitHits: 0,
            errors: 0,
            retries: 0,
        };

        this.startMemoryMonitoring();
    }

    private startMemoryMonitoring() {
        // Record initial memory usage
        const initialMemory = this.getCurrentMemoryUsage();
        this.metrics.memoryUsage = {
            initial: initialMemory,
            peak: initialMemory,
            final: initialMemory,
        };

        // Monitor memory usage every 5 seconds
        this.memoryCheckInterval = setInterval(() => {
            const currentMemory = this.getCurrentMemoryUsage();
            if (currentMemory > this.peakMemoryUsage) {
                this.peakMemoryUsage = currentMemory;
                if (this.metrics.memoryUsage) {
                    this.metrics.memoryUsage.peak = currentMemory;
                }
            }
        }, 5000);
    }

    private getCurrentMemoryUsage(): number {
        if (typeof window !== 'undefined' && (performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
    }

    public recordApiCall() {
        this.metrics.apiCalls++;
    }

    public recordRateLimitHit() {
        this.metrics.rateLimitHits++;
    }

    public recordError() {
        this.metrics.errors++;
    }

    public recordRetry() {
        this.metrics.retries++;
    }

    public recordDataPoints(count: number) {
        this.metrics.dataPoints += count;
    }

    public finish(): PerformanceMetrics {
        this.metrics.endTime = Date.now();
        this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

        // Record final memory usage
        if (this.metrics.memoryUsage) {
            this.metrics.memoryUsage.final = this.getCurrentMemoryUsage();
        }

        // Stop memory monitoring
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
        }

        return { ...this.metrics };
    }

    public getOptimizationSuggestions(): OptimizationSuggestion[] {
        const suggestions: OptimizationSuggestion[] = [];

        // Memory usage suggestions
        if (this.metrics.memoryUsage) {
            const memoryIncrease = this.metrics.memoryUsage.peak - this.metrics.memoryUsage.initial;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

            if (memoryIncreaseMB > 100) {
                suggestions.push({
                    type: 'memory',
                    severity: 'high',
                    message: `High memory usage detected (${memoryIncreaseMB.toFixed(1)}MB increase)`,
                    action: 'Consider using reduced scope or processing data in smaller batches',
                });
            } else if (memoryIncreaseMB > 50) {
                suggestions.push({
                    type: 'memory',
                    severity: 'medium',
                    message: `Moderate memory usage (${memoryIncreaseMB.toFixed(1)}MB increase)`,
                    action: 'Monitor memory usage for larger repositories',
                });
            }
        }

        // API usage suggestions
        if (this.metrics.rateLimitHits > 0) {
            suggestions.push({
                type: 'api',
                severity: 'high',
                message: `Rate limit hit ${this.metrics.rateLimitHits} times`,
                action: 'Consider using authentication or reducing analysis scope',
            });
        }

        if (this.metrics.apiCalls > 1000) {
            suggestions.push({
                type: 'api',
                severity: 'medium',
                message: `High API usage (${this.metrics.apiCalls} calls)`,
                action: 'Consider caching results or using reduced scope',
            });
        }

        // Performance suggestions
        if (this.metrics.duration && this.metrics.duration > 120000) { // 2 minutes
            suggestions.push({
                type: 'performance',
                severity: 'high',
                message: `Long processing time (${(this.metrics.duration / 1000).toFixed(1)}s)`,
                action: 'Consider using reduced scope for faster analysis',
            });
        }

        // Error rate suggestions
        const errorRate = this.metrics.errors / Math.max(this.metrics.apiCalls, 1);
        if (errorRate > 0.1) {
            suggestions.push({
                type: 'api',
                severity: 'high',
                message: `High error rate (${(errorRate * 100).toFixed(1)}%)`,
                action: 'Check network connectivity and API authentication',
            });
        }

        // Scope suggestions based on data volume
        if (this.metrics.dataPoints > 10000) {
            suggestions.push({
                type: 'scope',
                severity: 'medium',
                message: `Large dataset processed (${this.metrics.dataPoints.toLocaleString()} data points)`,
                action: 'Consider using time period filters or reduced scope for faster analysis',
            });
        }

        return suggestions;
    }

    public getMetricsSummary(): string {
        const duration = this.metrics.duration || (Date.now() - this.metrics.startTime);
        const durationSeconds = (duration / 1000).toFixed(1);

        let summary = `Analysis completed in ${durationSeconds}s`;
        summary += ` • ${this.metrics.dataPoints.toLocaleString()} data points`;
        summary += ` • ${this.metrics.apiCalls} API calls`;

        if (this.metrics.errors > 0) {
            summary += ` • ${this.metrics.errors} errors`;
        }

        if (this.metrics.retries > 0) {
            summary += ` • ${this.metrics.retries} retries`;
        }

        if (this.metrics.memoryUsage) {
            const memoryUsedMB = (this.metrics.memoryUsage.peak - this.metrics.memoryUsage.initial) / (1024 * 1024);
            if (memoryUsedMB > 1) {
                summary += ` • ${memoryUsedMB.toFixed(1)}MB memory used`;
            }
        }

        return summary;
    }
}

/**
 * Utility function to format memory usage in human-readable format
 */
export function formatMemoryUsage(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
}

/**
 * Utility function to format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Utility function to estimate processing time based on data size
 */
export function estimateProcessingTime(dataPoints: number, apiCalls: number): number {
    // Base time: 1 second
    let estimatedTime = 1000;

    // Add time based on data points (0.1ms per data point)
    estimatedTime += dataPoints * 0.1;

    // Add time based on API calls (200ms per call on average)
    estimatedTime += apiCalls * 200;

    // Add buffer for processing overhead (20%)
    estimatedTime *= 1.2;

    return Math.round(estimatedTime);
}

/**
 * Check if the current environment supports performance monitoring
 */
export function isPerformanceMonitoringSupported(): boolean {
    return typeof window !== 'undefined' &&
        typeof performance !== 'undefined' &&
        (performance as any).memory !== undefined;
}