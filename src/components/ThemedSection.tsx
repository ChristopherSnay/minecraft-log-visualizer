import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { SectionHeading } from './SectionHeading';

interface ThemedSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const ThemedSection: React.FC<ThemedSectionProps> = ({
  title,
  defaultExpanded,
  children
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(defaultExpanded ?? !isMobile);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_e, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        '&::before': { display: 'none' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 3,
        mt: 4,
        overflow: 'visible'
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 48,
          '& .MuiAccordionSummary-content': {
            my: 1.5,
            '&.Mui-expanded': { my: 1.5 }
          }
        }}
      >
        <SectionHeading sx={{ mt: 0, mb: 0, pb: 0, borderBottom: 0 }}>
          {title}
        </SectionHeading>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 1, sm: 3 }, pt: 0, pb: 3 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};
