import { Controller, Get, Route, Hidden } from 'tsoa';

@Route('metrics')
export class MetricsController extends Controller {
    @Hidden()
    @Get('/')
    public async getMetrics(): Promise<void> {
        // This is handled by metricsHandler directly
        // TSOA route generation only
    }
}
