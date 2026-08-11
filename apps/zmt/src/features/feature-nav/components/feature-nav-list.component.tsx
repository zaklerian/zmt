import { FeatureContribution, FeatureId } from '@contracts';
import { List, ListItemButton, ListItemText } from '@mui/material';

interface FeatureNavListProps {
  activeFeatureId: FeatureId | null;
  readonly features: readonly FeatureContribution[];
  onSelect: (featureId: FeatureId) => void;
}

// Nav mode (TL): a flat list of the enabled features. No search, no child trees
// — feature.label is the plugin-provided display string, rendered directly the
// same way the plugin's displayName and the settings feature switches render it.
export function FeatureNavList({
  activeFeatureId,
  features,
  onSelect,
}: FeatureNavListProps) {
  return (
    <List dense disablePadding>
      {features.map((feature) => (
        <ListItemButton
          key={feature.featureId}
          selected={feature.featureId === activeFeatureId}
          onClick={() => onSelect(feature.featureId)}
        >
          <ListItemText primary={feature.label} />
        </ListItemButton>
      ))}
    </List>
  );
}
