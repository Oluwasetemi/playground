import { usePlaygroundContext } from '../context/PlaygroundContext';

export function PlaygroundToolbar() {
  const { saveSnapshot, status } = usePlaygroundContext();

  return (
    <div className="playground-toolbar">
      <button onClick={saveSnapshot} disabled={status !== 'ready'}>
        Save
      </button>
      <div className="status-indicator" data-status={status}>
        {status === 'ready' && '✓ Ready'}
        {status === 'initializing' && '⏳ Initializing...'}
        {status === 'installing' && '📦 Installing...'}
        {status === 'error' && '❌ Error'}
      </div>
    </div>
  );
}
