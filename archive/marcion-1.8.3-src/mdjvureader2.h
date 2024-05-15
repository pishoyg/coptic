#ifndef MDJVUREADER2_H
#define MDJVUREADER2_H

#include <QMainWindow>
#include <QLayout>
#include <QFileInfo>

#include "djvuwidget.h"
#include "lsj.h"
#include "wordpreview.h"
#include "mwindowswidget.h"
#include "mcopticnumerals.h"
#include "mhebrdict.h"

namespace Ui {
class MDjvuReader2;
}

class MDjvuReader2 : public QMainWindow
{
    Q_OBJECT

public:
    explicit MDjvuReader2(QString const & filename);
    ~MDjvuReader2();

    CDjVuWidget & view(){return djView;}
    void fillContent(QList<QPair<QString,QVariant> >  const &);
    void showPanel();
private:
    Ui::MDjvuReader2 *ui;

    QDjVuContext context;
    CDjVuWidget djView;

    CLSJ * _gk;
    CWordPreview * _cop;
    MCopticNumerals * _num;
    MHebrDict * _heb;

    void init_reader(QString const &);

private slots:
    void on_cmbContent_activated(int index);
    void on_actionClose_triggered();
    void on_actionGk_Lat_dictionary_triggered();
    void on_actionCoptic_dictionary_triggered();
    void on_actionNumeric_converter_triggered();
    void on_action_Hebrew_dictionary_triggered();
};

#endif // MDJVUREADER2_H
