"""AURA-BLEND++ SDW-Net. Architecture copied from the training notebook."""

from __future__ import annotations

import math

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except (ImportError, OSError, Exception):
    TORCH_AVAILABLE = False
    torch = None
    nn = None

DROPOUT_PROB = 0.12
MAX_RESIDUAL_NORM = 0.15
HIDDEN = 160
N_MODELS = 3
LOCAL_EXTRA_CHANNELS = 13
GLOBAL_CHANNELS = 3

if TORCH_AVAILABLE:
    class ConvBlock(nn.Module):
        def __init__(self, cin: int, cout: int, dropout: float = 0.0):
            super().__init__()
            self.block = nn.Sequential(
                nn.Conv2d(cin, cout, 3, padding=1),
                nn.GroupNorm(min(8, cout), cout),
                nn.GELU(),
                nn.Dropout2d(dropout) if dropout > 0 else nn.Identity(),
                nn.Conv2d(cout, cout, 3, padding=1),
                nn.GroupNorm(min(8, cout), cout),
                nn.GELU(),
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.block(x)


    class GlobalContextEncoder(nn.Module):
        def __init__(self, cin: int, emb: int = 160):
            super().__init__()
            self.conv = nn.Sequential(
                ConvBlock(cin, 48, 0.05),
                nn.Conv2d(48, 80, 3, padding=1),
                nn.GELU(),
                nn.AdaptiveAvgPool2d(1),
            )
            self.fc = nn.Sequential(
                nn.Linear(80 + 5, emb),
                nn.GELU(),
                nn.LayerNorm(emb),
            )

        def forward(self, x: torch.Tensor, lead: torch.Tensor, sin_doy: torch.Tensor, cos_doy: torch.Tensor) -> torch.Tensor:
            z = self.conv(x).flatten(1)
            lead_phase = 2.0 * math.pi * lead
            scalars = torch.stack(
                [
                    lead,
                    torch.sin(lead_phase),
                    torch.cos(lead_phase),
                    sin_doy,
                    cos_doy,
                ],
                dim=1,
            )
            return self.fc(torch.cat([z, scalars], dim=1))


    class CrossAttentionFusion(nn.Module):
        def __init__(self, dim: int = 160, heads: int = 8):
            super().__init__()
            self.attn = nn.MultiheadAttention(dim, heads, batch_first=True, dropout=0.05)
            self.norm = nn.LayerNorm(dim)
            self.ff = nn.Sequential(
                nn.Linear(dim, dim * 2),
                nn.GELU(),
                nn.Dropout(0.05),
                nn.Linear(dim * 2, dim),
            )
            self.norm2 = nn.LayerNorm(dim)

        def forward(self, local_tokens: torch.Tensor, global_token: torch.Tensor) -> torch.Tensor:
            out, _ = self.attn(local_tokens, global_token, global_token)
            x = self.norm(local_tokens + out)
            return self.norm2(x + self.ff(x))


    class SDWNet(nn.Module):
        def __init__(
            self,
            n_models: int = N_MODELS,
            local_extra_channels: int = LOCAL_EXTRA_CHANNELS,
            global_channels: int = GLOBAL_CHANNELS,
            hidden: int = 160,
            max_residual_norm: float = 0.15,
        ):
            super().__init__()
            self.n_models = n_models
            self.max_residual_norm = max_residual_norm

            self.local = nn.Sequential(
                ConvBlock(n_models + local_extra_channels, 72, DROPOUT_PROB / 2),
                ConvBlock(72, hidden, DROPOUT_PROB / 2),
            )
            self.global_encoder = GlobalContextEncoder(global_channels, emb=hidden)
            self.fusion = CrossAttentionFusion(hidden, heads=8)

            self.logit_head = nn.Sequential(
                nn.Conv2d(hidden, hidden, 1),
                nn.GELU(),
                nn.Conv2d(hidden, n_models, 1),
            )
            self.residual_head = nn.Sequential(
                nn.Conv2d(hidden, hidden // 2, 3, padding=1),
                nn.GELU(),
                nn.Conv2d(hidden // 2, 1, 1),
                nn.Tanh(),
            )

        def forward(
            self,
            candidate: torch.Tensor,
            local_extra: torch.Tensor,
            regime: torch.Tensor,
            lead: torch.Tensor,
            sin_doy: torch.Tensor,
            cos_doy: torch.Tensor,
            model_mask: torch.Tensor | None = None,
            return_residual: bool = False,
        ):
            if model_mask is None:
                model_mask = torch.ones(
                    candidate.size(0), self.n_models, device=candidate.device
                )

            candidate_masked = candidate * model_mask[:, :, None, None]
            local_in = torch.cat([candidate_masked, local_extra], dim=1)
            local_feat = self.local(local_in)

            global_vec = self.global_encoder(regime, lead, sin_doy, cos_doy)
            B, C, H, W = local_feat.shape
            tokens = local_feat.flatten(2).transpose(1, 2)
            global_token = global_vec[:, None, :]
            fused = self.fusion(tokens, global_token)
            fused_map = fused.transpose(1, 2).reshape(B, C, H, W)

            logits = self.logit_head(fused_map)
            weights = torch.softmax(logits, dim=1)
            weights = weights * model_mask[:, :, None, None]
            weights = weights / (weights.sum(dim=1, keepdim=True) + 1e-8)

            residual = self.max_residual_norm * self.residual_head(fused_map)

            if return_residual:
                return weights, residual
            return weights

    def build_sdw_net(max_residual_norm: float = MAX_RESIDUAL_NORM) -> SDWNet:
        return SDWNet(
            n_models=N_MODELS,
            local_extra_channels=LOCAL_EXTRA_CHANNELS,
            global_channels=GLOBAL_CHANNELS,
            hidden=HIDDEN,
            max_residual_norm=max_residual_norm,
        )
else:
    def build_sdw_net(max_residual_norm: float = MAX_RESIDUAL_NORM):
        raise RuntimeError("PyTorch is required for live SDWNet inference.")