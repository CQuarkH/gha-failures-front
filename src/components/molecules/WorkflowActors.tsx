import { useEffect, useState } from 'react';
import type { GHRun } from '../../models/GHRun';

interface WorkflowActorsProps {
    runs: GHRun[];
}

interface ActorDetails {
    id: string;
    login: string;
    avatar_url: string;
    html_url: string;
}

export default function WorkflowActors({ runs }: WorkflowActorsProps) {
    const [actors, setActors] = useState<ActorDetails[]>([]);

    useEffect(() => {
        const urls = new Set<string>();
        runs.forEach(run => {
            run.actor?.url && urls.add(run.actor.url);
            run.triggeringActor?.url && urls.add(run.triggeringActor.url);
        });

        Promise.all(
            Array.from(urls).map(url =>
                fetch(url)
                    .then(res => res.json())
                    .then((data: any) => ({
                        id: data.id?.toString() ?? url,
                        login: data.login,
                        avatar_url: data.avatar_url,
                        html_url: data.html_url,
                    }))
            )
        )
            .then(results => setActors(results))
            .catch(err => console.error('Error fetching actor data', err));
    }, [runs]);

    return (
        <div className="flex flex-col gap-5 bg-white p-5 rounded-lg shadow-lg w-90 h-min border border-gray-300">
            <h2 className="text-lg font-semibold">Workflow Actors</h2>
            <div className="flex flex-col gap-4">
                {actors.map(actor => (
                    <div key={actor.id} className="flex items-center gap-3 p-2 hover:shadow-lg transition-shadow">
                        <img
                            src={actor.avatar_url}
                            alt={actor.login}
                            className="w-10 h-10 rounded-full"
                        />
                        <div>
                            <p className="font-medium text-base">{actor.login}</p>
                            <a
                                href={actor.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Ver perfil
                            </a>
                        </div>
                    </div>
                ))}
                {actors.length === 0 && (
                    <p className="text-sm text-gray-500">
                        No se encontraron actores en los runs proporcionados.
                    </p>
                )}
            </div>
        </div>
    );
}
