import { Typography, Button, Box } from "@mui/material";
import CodeEditor from "../../../components/CodeEditor";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useEffect, useState } from 'react';

type Props = {
  language: string;
  code: string[];
};

const SubmissionPreview = ({ language, code }: Props) => {
  const [copyButton, setCopyButton] = useState({
    label: "COPY CODE",
    icon: <ContentCopyIcon fontSize="small" sx={{ marginRight: 1 }} />,
  })

  useEffect(() => {
    setCopyButton({
      label: "COPY CODE",
      icon: <ContentCopyIcon fontSize="small" sx={{ marginRight: 1 }} />,
    });
  }, [code])
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code.join("\n"));
    setCopyButton({
      label: "COPIED",
      icon: <DoneAllIcon fontSize="small" sx={{ marginRight: 1, color: "green" }} />,
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          color="text.secondary"
          variant="subtitle1"
          align="left"
          fontWeight="bold"
        >
          {language}
        </Typography>
          <Button
            variant="outlined"
            size="medium"
            onClick={copyToClipboard}
            sx={{
              border: 1,
              borderRadius: 1.5,
              borderColor: "text.disabled",
              color: copyButton.label === 'COPIED' ? "green" : "text.primary",
              "&:hover": {
                border: 1,
                borderRadius: 1.5,
                borderColor: "text.disabled",
                bgcolor: "text.disabled",
                color: copyButton.label === 'COPIED' ? "green" : "primary.main",
              }
            }}
          >
            {copyButton.icon} {copyButton.label}
          </Button>
      </Box>

      <CodeEditor language={language.toLowerCase()} code={code} readOnly />
    </Box>
  );
};
export default SubmissionPreview;
