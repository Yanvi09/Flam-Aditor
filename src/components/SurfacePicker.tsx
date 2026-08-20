import { surfaces, getAllSurfaceNames } from '../engine/surfaces';
import './SurfacePicker.css';

interface SurfacePickerProps {
  selectedSurface: string;
  onSurfaceSelect: (surfaceName: string) => void;
}

export function SurfacePicker({ selectedSurface, onSurfaceSelect }: SurfacePickerProps) {
  const surfaceNames = getAllSurfaceNames();

  return (
    <div className="surface-picker">
      {surfaceNames.map((name) => {
        const surface = surfaces[name];
        return (
          <button
            key={name}
            className={`surface-option ${selectedSurface === name ? 'active' : ''}`}
            onClick={() => onSurfaceSelect(name)}
          >
            <div className="surface-name">{formatSurfaceName(name)}</div>
            <div className="surface-dimensions">
              {surface.width} × {surface.height}
            </div>
            {surface.minTapTarget && (
              <div className="surface-constraint">min tap: {surface.minTapTarget}px</div>
            )}
            {surface.minTextSize && (
              <div className="surface-constraint">min text: {surface.minTextSize}px</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function formatSurfaceName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}