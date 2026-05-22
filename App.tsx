import React, { useState, useCallback } from 'react';
import LatinAnnotator from './LatinAnnotator';

const App: React.FC = () => {
    const [sessionKey, setSessionKey] = useState(0);

    const handleReset = useCallback(() => {
        // By changing the key, we tell React to unmount the old component
        // and mount a new one, effectively resetting its entire state.
        // This is the most robust way to handle a full component reset.
        setSessionKey(prevKey => prevKey + 1);
    }, []);

    return <LatinAnnotator key={sessionKey} onResetRequest={handleReset} />;
};

export default App;
