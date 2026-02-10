import { Button, Page, Tabs } from "@shopify/polaris";
import { Link, useNavigate } from "react-router";
import { useState } from "react";

export default function BundlesIndex() {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState(0);

    const tabs = [
        {
            id: "classic-bundle",
            content: "Classic Bundle",
            panelID: "classic-bundle-content",
        },
        // In the future, add more types here
    ];

    return (
        <Page
            backAction={{
                onAction: () => navigate("/app/actions"),
            }}
            title="Bundle Campaigns"
        >
            <Tabs
                tabs={tabs}
                selected={selectedTab}
                onSelect={setSelectedTab}
            >
                {selectedTab === 0 && (
                    <div style={{ marginTop: 24 }}>
                        {/* Classic Bundle Tab content here */}
                        <Link to="new?type=classic-bundle">
                            <Button variant="primary">Create Classic Bundle</Button>
                        </Link>
                        {/* Here you will display list of classic bundles in the future */}
                    </div>
                )}
            </Tabs>
        </Page>
    );
}
