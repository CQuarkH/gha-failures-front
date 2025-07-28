import { useState } from 'react'
import { WorkflowLayerDesign } from './WorkflowLayerDesign'
import { GHRun } from '../models/GHRun'

interface Workflow {
    id: number
    name: string
}

const API_URL = 'http://localhost:3333/api'

export default function RunsLoaderPage() {
    const [inputUrl, setInputUrl] = useState('')
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [selected, setSelected] = useState<string>()
    const [repo, setRepo] = useState('')
    const [runs, setRuns] = useState<GHRun[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    const fetchWorkflows = async () => {
        try {
            const match = inputUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/|$)/)
            if (!match) throw new Error('URL inválida')
            const [, owner, repo] = match

            const res = await fetch(`${API_URL}/workflows?owner=${owner}&repo=${repo}`)
            if (!res.ok) throw new Error(await res.text())
            const list: Workflow[] = await res.json()
            setRepo(owner + '/' + repo)
            setWorkflows(list)
        } catch (e: any) {
            setError(e.message)
        }
    }

    // 2) Cuando el usuario elige un workflow:
    const fetchRuns = async () => {
        if (selected == null) return
        setLoading(true)
        setError(undefined)
        try {
            console.log('Fetching runs for workflow:', selected)
            const res = await fetch(`${API_URL}/runs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowId: selected, owner: inputUrl.split('/')[3], repo: inputUrl.split('/')[4] })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            const runs = GHRun.fromJSONList(data)
            console.log('Fetched runs:', runs)
            setRuns(runs)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='flex flex-col h-screen w-screen bg-gray-100 items-center justify-center'>
            {runs.length <= 0 && (
                <div className='flex flex-col items-center justify-center gap-4 p-10 bg-white shadow-lg rounded-lg'>
                    <h1 className="text-2xl font-bold">Runs Loader</h1>

                    <div>
                        <input
                            className="border px-2 py-1 mr-2"
                            placeholder="https://github.com/owner/repo"
                            value={inputUrl}
                            onChange={e => setInputUrl(e.target.value)}
                        />
                        <button onClick={fetchWorkflows} className="bg-blue-500 text-white px-4 py-2">
                            Listar workflows
                        </button>
                    </div>

                    {error && <p className="text-red-600">{error}</p>}

                    {!!workflows.length && (
                        <div>
                            <select
                                className="border px-2 py-1"
                                onChange={e => setSelected(e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>Selecciona un workflow</option>
                                {workflows.map(w => (
                                    <option key={w.id} value={w.name}>{w.name}</option>
                                ))}
                            </select>
                            <button onClick={fetchRuns} className="bg-blue-500 text-white px-4 py-2">
                                Cargar runs
                            </button>
                        </div>
                    )}


                </div>
            )}

            {loading && <p>Cargando runs…</p>}
            {runs.length > 0 && (
                <WorkflowLayerDesign data={runs} name={`${selected!} - ${repo}`} />
            )}
        </div>
    )
}
