import type { GHRun } from '../../models/GHRun';
import { TimeUtils } from '../../utils/TimeUtils';
import type { CanvasElement } from '../../types/canvas';
import { useEffect, useState } from 'react';

interface WorkflowStatsProps {
    runs: GHRun[];
    lastSelectedElement?: CanvasElement | null;
}

type Stats = {
    title: string;
    value: string | number;
    className?: string;
}

const getStatsByRuns = (runs: GHRun[]): Stats[] => {
    const totalRuns = runs.length;
    const successes = runs.filter(r => r.status === 'completed' && r.conclusion === 'success');
    const failures = runs.filter(r => r.status === 'completed' && r.conclusion === 'failure');
    const inProgress = runs.filter(r => r.status === 'in_progress');

    // Percent success
    const successRate = totalRuns > 0 ? (successes.length / totalRuns) * 100 : 0;

    // Total execution times per run (in seconds)
    const times = runs.map(r => r.totalExecutionTime);
    const sumTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalRuns > 0 ? Math.round(sumTime / totalRuns) : 0;

    // Time lost: total time spent on failed runs
    const lostTime = failures.map(r => r.totalExecutionTime).reduce((a, b) => a + b, 0);

    return [
        { title: 'Total Runs', value: totalRuns },
        { title: 'Successes', value: `${successes.length} (${successRate.toFixed(1)}%)`, className: 'text-green-600 font-medium' },
        { title: 'Failures', value: failures.length, className: 'text-red-600 font-medium' },
        { title: 'In Progress', value: inProgress.length, className: 'text-yellow-600 font-medium' },
        { title: 'Average Execution Time', value: TimeUtils.formatTime(avgTime) },
        { title: 'Total Time Lost', value: TimeUtils.formatTime(lostTime), className: 'text-red-600 font-medium' }
    ];
}

const getStatsByElement = (runs: GHRun[], lastSelectedElement?: CanvasElement | null): Stats[] => {
    if (!lastSelectedElement) return [];

    const { type, data } = lastSelectedElement;

    switch (type) {
        case 'run':
            return [
                { title: 'Run ID', value: data.id },
                { title: 'Run Name', value: data.name },
                { title: 'Conclusion', value: data.conclusion || 'N/A', className: data.conclusion === 'failure' ? 'text-red-600' : '' },
                { title: 'Total Execution Time', value: TimeUtils.formatTime(data.totalExecutionTime) },
                { title: 'Attempts', value: data.attempts.length },
                { title: 'Jobs', value: data.attempts[data.attempts.length - 1].jobs.length },
            ];
        case 'attempt':
            return [
                { title: 'Attempt Number', value: data.runAttempt },
                { title: 'Conclusion', value: data.conclusion || 'N/A', className: data.conclusion === 'failure' ? 'text-red-600' : '' },
                { title: 'Jobs', value: data.jobs.length },
                { title: 'Execution Time', value: TimeUtils.formatTime(data.executionTime) }
            ];

        case 'job':
            return [
                { title: 'Job ID', value: data.id },
                { title: 'Job Name', value: data.name },
                { title: 'Conclusion', value: data.conclusion || 'N/A', className: data.conclusion === 'failure' ? 'text-red-600' : '' },
                { title: 'Steps', value: data.steps.length },
                { title: 'Execution Time', value: TimeUtils.formatTime(data.executionTime) }
            ];
        case 'step':
            return [
                { title: 'Step Number', value: data.number },
                { title: 'Step Name', value: data.name },
                { title: 'Conclusion', value: data.conclusion || 'N/A', className: data.conclusion === 'failure' ? 'text-red-600' : '' },
                { title: 'Execution Time', value: TimeUtils.formatTime(data.executionTime) }
            ];
        default:
            return getStatsByRuns(runs);
    }
}

const getTitleByElementType = (type: string): string => {
    switch (type) {
        case 'run':
            return 'Run Statistics';
        case 'attempt':
            return 'Attempt Statistics';
        case 'job':
            return 'Job Statistics';
        case 'step':
            return 'Step Statistics';
        default:
            return 'Workflow Statistics';
    }
}

export default function WorkflowStats({ runs, lastSelectedElement }: WorkflowStatsProps) {
    const [stats, setStats] = useState<Stats[]>([]);
    useEffect(() => {
        if (lastSelectedElement) {
            setStats(getStatsByElement(runs, lastSelectedElement));
        } else {
            setStats(getStatsByRuns(runs));
        }
    }, [lastSelectedElement])

    return (
        <div className="flex flex-col gap-5 bg-white p-5 rounded-lg shadow-lg w-90 h-min border border-gray-300">
            <h2 className="text-lg font-semibold ">{getTitleByElementType(lastSelectedElement?.type || '')}</h2>
            <ul className="flex flex-col gap-2">
                {stats.map((stat, index) => (
                    <li key={index} className={`flex justify-between ${stat.className || ''}`}>
                        <span className="font-medium">{stat.title}:</span>
                        <span>{stat.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
