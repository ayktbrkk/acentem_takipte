import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            exclude: [...configDefaults.exclude, 'e2e/**', 'tests/e2e/**',
                'src/components/app-shell/AccessRequestForm.test.js',
                'src/domains/payments/pages/PaymentDetail.test.js',
                'src/domains/renewals/pages/RenewalTaskDetail.test.js',
            ],
            root: fileURLToPath(new URL('./', import.meta.url)),
            setupFiles: ['./tests/setup.js']
        }
    })
)
