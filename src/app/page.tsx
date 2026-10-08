import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import NetworkSimulator from "@/components/NetworkSimulator";

export default function Home() {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", py: { xs: 1.5, sm: 2 } }}>
      <Container maxWidth="lg">
        <Box textAlign="center" mb={1.5}>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ fontSize: { xs: "1.3rem", sm: "1.6rem" } }}>
            🌐 ブラウザとWebサーバの通信
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SNSに画像を投稿するとき、データがパケットに分けられ、ルータをたどって届き、TCPで元に戻されるまでを問題を解きながら見てみよう
          </Typography>
        </Box>
        <NetworkSimulator />
      </Container>
    </Box>
  );
}
