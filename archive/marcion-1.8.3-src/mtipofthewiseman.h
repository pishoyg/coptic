#ifndef MTIPOFTHEWISEMAN_H
#define MTIPOFTHEWISEMAN_H

#include <QWidget>
#include <QDesktopWidget>

#include "settings.h"

namespace Ui {
class MTipOfTheWiseMan;
}

class MTipOfTheWiseMan : public QWidget
{
    Q_OBJECT

public:
    explicit MTipOfTheWiseMan(QWidget *parent = 0);
    ~MTipOfTheWiseMan();

private slots:
    void on_btClose_clicked();
    void on_btNextTip_clicked();
    void on_txtTip_anchorClicked(const QUrl &arg1);
private:
    Ui::MTipOfTheWiseMan *ui;

    int _last_tip,_max_tip;
};

#endif // MTIPOFTHEWISEMAN_H
