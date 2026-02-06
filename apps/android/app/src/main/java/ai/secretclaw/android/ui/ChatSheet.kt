package ai.secretclaw.android.ui

import androidx.compose.runtime.Composable
import ai.secretclaw.android.MainViewModel
import ai.secretclaw.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
