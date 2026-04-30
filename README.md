---
title: VideoEdit
emoji: 🎞️
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: AI-powered memory video maker — Groq vision + Sonauto music
---

# VideoEdit — AI Memory Video Maker

Multi-photo → cinematic video, with AI-generated captions (Groq vision) and
AI-generated music (Sonauto). Mobile-friendly UI; full FFmpeg render pipeline
runs inside this Hugging Face Space.

## Required secrets (Settings → Variables and secrets)

| Name | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | yes | https://console.groq.com — used for caption + vision |
| `SONAUTO_API_KEY` | optional | https://sonauto.ai — leave empty to disable AI music |

Source: https://github.com/bhupenderkumar/videoedit
