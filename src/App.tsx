import React from 'react';
import { ColoringProvider, useColoring } from './context/ColoringContext';
import { SplashView } from './components/SplashView';
import { HomeView } from './components/HomeView';
import { ColoringView } from './components/ColoringView';
import { GalleryView } from './components/GalleryView';
import { FinishedView } from './components/FinishedView';
import { StudioView } from './components/StudioView';
import { UserDrawingRecordingStudio } from './components/UserDrawingRecordingStudio';
import { KidStepByStepGenerator } from './components/KidStepByStepGenerator';
import { BottomNavBar } from './components/BottomNavBar';
import { BrushSettingsModal } from './components/BrushSettingsModal';

const AppContent: React.FC = () => {
  const { screen, setScreen } = useColoring();

  const renderCurrentScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashView />;
      case 'home':
        return <HomeView />;
      case 'coloring':
        return <ColoringView />;
      case 'gallery':
        return <GalleryView />;
      case 'finished':
        return <FinishedView />;
      case 'studio':
        return <StudioView />;
      case 'recording_studio':
        return <UserDrawingRecordingStudio onBackToStudio={() => setScreen('studio')} />;
      case 'kid_video_generator':
        return <KidStepByStepGenerator onClose={() => setScreen('home')} />;
      default:
        return <HomeView />;
    }
  };

  const isStudio = screen === 'studio' || screen === 'recording_studio' || screen === 'kid_video_generator';

  return (
    <div className="w-full min-h-screen bg-[#F7EEF0] flex items-center justify-center p-0 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Mobile Device Frame Container or Expanded Studio Console */}
      <div
        className={`relative w-full h-[100dvh] transition-all duration-300 ${
          isStudio
            ? 'sm:h-[94vh] sm:max-w-6xl sm:rounded-3xl'
            : 'sm:h-[844px] sm:max-w-[390px] sm:rounded-[44px]'
        } bg-[#FFF5F7] sm:shadow-2xl sm:border-[8px] sm:border-[#2C2426]/10 overflow-hidden flex flex-col`}
      >
        {/* Dynamic Island on Mobile Device Preview */}
        {!isStudio && (
          <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 z-50 w-28 h-4 bg-black/80 rounded-full items-center justify-end px-3">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
          </div>
        )}

        {/* Active Screen */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col">
          {renderCurrentScreen()}
        </div>

        {/* Fixed Mobile Tab Navigation (hidden in Studio Mode for clean filming) */}
        {!isStudio && <BottomNavBar />}

        {/* Global Brush Settings Scratchpad Dialog */}
        <BrushSettingsModal />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ColoringProvider>
      <AppContent />
    </ColoringProvider>
  );
}

