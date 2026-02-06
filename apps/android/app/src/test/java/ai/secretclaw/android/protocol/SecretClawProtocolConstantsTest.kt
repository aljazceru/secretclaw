package ai.secretclaw.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class SecretClawProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", SecretClawCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", SecretClawCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", SecretClawCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", SecretClawCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", SecretClawCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", SecretClawCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", SecretClawCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", SecretClawCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", SecretClawCapability.Canvas.rawValue)
    assertEquals("camera", SecretClawCapability.Camera.rawValue)
    assertEquals("screen", SecretClawCapability.Screen.rawValue)
    assertEquals("voiceWake", SecretClawCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", SecretClawScreenCommand.Record.rawValue)
  }
}
