'use client';

import { useEffect } from 'react';
import markerSDK from '@marker.io/browser';

const MarkerIOProvider = () => {
  useEffect(() => {
    async function loadMarkerWidget() {
      await markerSDK.loadWidget({
        project: '68ff71f38e52dae21d659cce',
        source: 'snippet',
      });
    }

    loadMarkerWidget();
  }, []);

  return null;
};

export default MarkerIOProvider;
