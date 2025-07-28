import type { GHRun } from '../../models/GHRun';
import { TimeUtils } from '../../utils/TimeUtils';

interface WorkflowStatsProps {
    runs: GHRun[];
}

export default function WorkflowStats({ runs }: WorkflowStatsProps) {
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

    // Find the failure consuming most time
    const worstFail = failures.reduce((prev, curr) => (curr.totalExecutionTime > (prev?.totalExecutionTime ?? 0) ? curr : prev), failures[0]);

    return (
        <div className="flex flex-col gap-5 bg-white p-5 rounded-lg shadow-lg w-90 h-min border border-gray-300">
            <h2 className="text-lg font-semibold ">Workflow Statistics</h2>
            <ul className="flex flex-col gap-2">
                <li>Total Runs: <span className="font-medium">{totalRuns}</span></li>
                <li>Successes: <span className="text-green-600 font-medium">{successes.length} ({successRate.toFixed(1)}%)</span></li>
                <li>Failures: <span className="text-red-600 font-medium">{failures.length}</span></li>
                <li>In Progress: <span className="text-yellow-600 font-medium">{inProgress.length}</span></li>
                <li>Average Execution Time: <span className="font-medium">{TimeUtils.formatTime(avgTime)}</span></li>
                <li>Total Time Lost: <span className="text-red-600 font-medium">{TimeUtils.formatTime(lostTime)}</span></li>
                {/* {worstFail && (
                    <li>
                        Worst Failure ID: <span className="text-red-600 font-medium">{worstFail.id}</span> -
                        <span className="text-gray-600"> {worstFail.name} </span>
                        <span className="text-red-600 font-medium">
                            ({TimeUtils.formatTime(worstFail.totalExecutionTime)})</span>
                    </li>
                )} */}
            </ul>
        </div>
    )
}
