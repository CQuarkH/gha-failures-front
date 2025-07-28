import type { GHRun } from "../models/GHRun";
import { CanvasContainer } from "../components/organisms/CanvasContainer";

interface WorkflowCanvasPageProps {
    data: GHRun[];
    name: string;
}

export const WorkflowCanvasPage = ({ data, name }: WorkflowCanvasPageProps) => {
    return (
        <div className="flex flex-col gap-10 h-screen w-screen p-10 bg-white">
            <h1 className="text-3xl font-semibold w-full flex flex-col gap-3">
                <p className="text-lg font-normal">Workflow Analysis</p>
                {name}
            </h1>

            <div className="flex gap-5 h-full w-full bg-white border border-gray-300 rounded-lg">
                <CanvasContainer data={data} />
            </div>
        </div>
    );
};